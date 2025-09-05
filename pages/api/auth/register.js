import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../../../src/firebase-admin';

export default async function handler(req, res) {
  switch (req.method) {
    case 'POST':
      try {
        console.log('Register API - POST request received. Body:', req.body);

        const { name, email, password } = req.body;

        if (!name || !email || !password) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        // 1. Create the user in Firebase Authentication
        const userRecord = await adminAuth.createUser({
          email: email,
          password: password,
          displayName: name,
        });

        const uid = userRecord.uid;
        let userRoles = ['Member']; // Default role
        let customClaims = { roles: userRoles }; // Default claims

        // 2. Handle the special super admin user case
        if (email.toLowerCase() === 'jaoverell@gmail.com' || name === 'James Overell' || email.toLowerCase() === 'jules.test.admin@example.com') {
          userRoles.push('Admin'); // Visible role
          customClaims = {
            roles: userRoles,
            isSuperAdmin: true, // Hidden privilege
          };
          console.log(`Super admin privileges granted to ${email}`);
        }

        // Set custom claims for role-based access control
        await adminAuth.setCustomUserClaims(uid, customClaims);

        // 3. Create a corresponding user document in Firestore
        const userDocRef = adminDb.collection('users').doc(uid);
        await userDocRef.set({
          name: name,
          email: email,
          roles: userRoles, // Store roles in the user document as well
          createdAt: FieldValue.serverTimestamp(),
        });

        return res.status(201).json({ message: 'User created successfully', uid: uid });

      } catch (error) {
        console.error('Registration Error:', error);
        if (error.code === 'auth/email-already-exists') {
          return res.status(409).json({ message: 'User with this email already exists' });
        }
        // This can happen if the FIREBASE_SERVICE_ACCOUNT_KEY is not set
        if (error.message.includes('Must initialize app')) {
            return res.status(500).json({ message: 'Server configuration error. Please check Firebase Admin setup.' });
        }
        return res.status(500).json({ message: 'An error occurred during registration' });
      }
      break;

    default:
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
