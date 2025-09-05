import { adminAuth, adminDb } from '../../../src/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  switch (req.method) {
    case 'POST':
      try {
        console.log('Login API - POST request received. Body:', req.body);
        const { idToken } = req.body;

        if (!idToken) {
          return res.status(400).json({ message: 'ID token is required' });
        }

        // 1. Verify the ID token with Firebase Admin SDK
        console.log('Verifying ID token with Firebase...');
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const email = decodedToken.email;
        console.log('ID token verified. UID:', uid);

        // 2. Fetch user auth record and Firestore document
        console.log('Fetching user records...');
        const userAuth = await adminAuth.getUser(uid);
        const userDocRef = adminDb.collection('users').doc(uid);
        let userDoc = await userDocRef.get();
        let user, userRoles, customClaims;

        // Determine if the user meets super admin criteria
        const isSuperAdminUser = (
          email.toLowerCase() === 'jaoverell@gmail.com' ||
          (userDoc.exists && userDoc.data().name === 'James Overell') ||
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
            createdAt: FieldValue.serverTimestamp(),
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
          // Always use the latest roles from Firestore, but preserve existing claims like isSuperAdmin
          customClaims = { ...(userAuth.customClaims || {}), roles: userRoles };
        }

        // Use the latest roles and claims for the session, including super admin status
        const roles = userRoles;
        let groupIds = user.groupIds || user.groups || []; // Coalesce groups/groupIds for compatibility
        const isSuperAdmin = customClaims.isSuperAdmin || false;

        // On-the-fly migration for users with legacy 'groups' (an array of names)
        if (user.groups && typeof user.groupIds === 'undefined') {
          console.log(`User ${email} has legacy 'groups' field. Migrating...`);
          const groupNames = user.groups;
          const accessGroupsRef = adminDb.collection('access_groups');
          const q = accessGroupsRef.where('name', 'in', groupNames);
          const querySnapshot = await q.get();
          const foundGroupIds = querySnapshot.docs.map(doc => doc.id);

          await userDocRef.update({
              groupIds: foundGroupIds,
              groups: FieldValue.delete()
          });

          // Also update custom claims
          const newClaims = { ...(userAuth.customClaims || {}) };
          delete newClaims.groups;
          newClaims.groupIds = foundGroupIds;
          await adminAuth.setCustomUserClaims(uid, newClaims);

          // Use the newly migrated IDs for the current session
          groupIds = foundGroupIds;
          console.log(`Migrated 'groups' to 'groupIds' for user ${email}`);
        }

        // 4. Create a custom JWT for our application session
        console.log('Creating JWT...');
        const token = jwt.sign(
          { userId: uid, email: user.email, name: user.name, roles, groupIds, isSuperAdmin },
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
          uid: uid,
          name: user.name,
          email: user.email,
          roles,
          groupIds,
        });

      } catch (error) {
        console.error('Login Error:', error);
        if (error.code === 'auth/id-token-expired' || error.code === 'auth/argument-error') {
            return res.status(401).json({ message: 'Invalid or expired session. Please log in again.' });
        }
        return res.status(500).json({ message: 'An error occurred during login' });
      }
      break;

    default:
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
