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

        // 2. Fetch user data and permissions from Firestore
        console.log('Fetching user data from Firestore...');
        const userDocRef = adminDb.collection('users').doc(uid);
        let userDoc = await userDocRef.get();
        let user;

        if (!userDoc.exists) {
          console.log('User profile not found in Firestore. Creating one...');

          const newUser = {
            name: authData.displayName || 'New User',
            email: email,
            roles: ['Member'],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          if (email === 'jaoverell@gmail.com') {
            newUser.roles.push('Admin');
            await adminAuth.setCustomUserClaims(uid, { roles: newUser.roles });
          }

          await userDocRef.set(newUser);

          user = newUser;
          console.log('User profile created in Firestore.');

        } else {
            user = userDoc.data();
            console.log('User data fetched:', user);
        }

        // Fallback for roles and groupIds if they don't exist
        const roles = user.roles || [];
        const groupIds = user.groupIds || [];

        // 3. Create a custom JWT for our application session
        console.log('Creating JWT...');
        const token = jwt.sign(
          { userId: uid, email: user.email, name: user.name, roles, groupIds },
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
          groupIds,
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
