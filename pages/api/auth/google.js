import { adminDb, adminAuth } from '../../../src/firebase-admin';
import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';
import admin from 'firebase-admin';

const JWT_SECRET = process.env.JWT_SECRET;

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { idToken } = req.body;

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    const userDocRef = adminDb.collection('users').doc(uid);
    let userDoc = await userDocRef.get();
    let userData;

    if (!userDoc.exists) {
      console.log(`Creating new user profile for UID: ${uid}`);
      const newUser = {
        name: name || 'New User',
        email: email,
        roles: ['Member'], // Default role
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await userDocRef.set(newUser);
      userData = newUser;
    } else {
      userData = userDoc.data();
    }

    // Create a JWT token that includes the user's roles and other details
    const tokenPayload = {
      userId: uid, // <-- CHANGE THIS LINE from 'uid' to 'userId'
      name: userData.name,
      email: userData.email,
      roles: userData.roles || [],
      groupIds: userData.groupIds || [],
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.setHeader('Set-Cookie', serialize('auth_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: 'strict',
    }));

    // Respond with the user object directly for consistency with other login methods
    res.status(200).json(tokenPayload);

  } catch (error) {
    console.error('Login with Google error:', error);
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};
