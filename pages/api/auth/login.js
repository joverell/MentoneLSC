import { adminAuth, adminDb } from '../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import admin from 'firebase-admin';

const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';
// This is your Web API Key from your Firebase project's client-side config.
// It's safe to expose this. It's best to set this as an environment variable.
const FIREBASE_WEB_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDgvrCV5dZDz38RcTEjLimuptSjKzqHIG0';

async function verifyPassword(email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email,
      password: password,
      returnSecureToken: true,
    }),
  });

  if (!response.ok) {
    throw new Error('Invalid credentials');
  }

  return response.json();
}

export default async function handler(req, res) {
  switch (req.method) {
    case 'POST':
      try {
        console.log('Login API - POST request received. Body:', req.body);
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({ message: 'Email and password are required' });
        }

        // 1. Verify password with Firebase Auth REST API
        console.log('Verifying password with Firebase...');
        const authData = await verifyPassword(email, password);
        console.log('Password verified. UID:', authData.localId);
        const uid = authData.localId;

        // 2. Fetch user auth record and Firestore document
        console.log('Fetching user records...');
        const userAuth = await adminAuth.getUser(uid);
        const userDocRef = adminDb.collection('users').doc(uid);
        let userDoc = await userDocRef.get();
        let user, userRoles, customClaims;

        // Determine if the user meets super admin criteria
        const isSuperAdminUser = (
          email.toLowerCase() === 'jaoverell@gmail.com' ||
          (userDoc.exists() && userDoc.data().name === 'James Overell') ||
          userAuth.displayName === 'James Overell'
        );

        if (!userDoc.exists) {
          console.log('User profile not found in Firestore. Creating one...');
          userRoles = ['Member'];
          if (isSuperAdminUser) {
            userRoles.push('Admin');
          }

          const newUser = {
            name: userAuth.displayName || 'New User',
            email: email,
            roles: userRoles,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          };
          await userDocRef.set(newUser);
          user = newUser;
          console.log('User profile created in Firestore.');
        } else {
          user = userDoc.data();
          userRoles = user.roles || ['Member'];
          // Ensure existing super admin has 'Admin' role in Firestore, if not add it
          if (isSuperAdminUser && !userRoles.includes('Admin')) {
            userRoles.push('Admin');
            await userDocRef.update({ roles: userRoles });
            console.log(`Updated Firestore roles for super admin ${email}`);
          }
          console.log('User data fetched:', user);
        }

        // 3. Check and apply Super Admin custom claims if necessary.
        // This handles promoting an existing user on login.
        const needsSuperAdminClaim = isSuperAdminUser && !userAuth.customClaims?.isSuperAdmin;
        if (needsSuperAdminClaim) {
          console.log(`Setting isSuperAdmin claim for ${email}`);
          customClaims = { ...(userAuth.customClaims || {}), roles: userRoles, isSuperAdmin: true };
          await adminAuth.setCustomUserClaims(uid, customClaims);
        } else {
          customClaims = userAuth.customClaims || { roles: userRoles };
        }

        // Use the latest roles and claims for the session
        const roles = userRoles;
        const groups = user.groups || [];
        const isSuperAdmin = customClaims.isSuperAdmin || false;

        // 4. Create a custom JWT for our application session
        console.log('Creating JWT...');
        const token = jwt.sign(
          { userId: uid, email: user.email, name: user.name, roles, groups, isSuperAdmin },
          JWT_SECRET,
          { expiresIn: '1h' }
        );
        console.log('JWT created.');


        const cookie = serialize('auth_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'development',
          sameSite: 'strict',
          maxAge: 60 * 60, // 1 hour
          path: '/',
        });

        res.setHeader('Set-Cookie', cookie);

        // 4. Respond with user info
        res.status(200).json({
          id: uid,
          name: user.name,
          email: user.email,
          roles,
          groups,
        });

      } catch (error) {
        console.error('Login Error:', error);
        if (error.message === 'Invalid credentials') {
          return res.status(401).json({ message: 'Invalid credentials' });
        }
        return res.status(500).json({ message: 'An error occurred during login' });
      }
      break;

    default:
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
