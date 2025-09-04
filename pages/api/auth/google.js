import { adminDb, adminAuth } from '../../../src/firebase-admin';
import { serialize } from 'cookie';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

const registerUserWithProvider = async (uid, email, displayName, provider) => {
  const usersRef = adminDb.collection('users');
  const snapshot = await usersRef.where('email', '==', email).limit(1).get();

  if (!snapshot.empty) {
    // User exists, update their provider info
    const userDoc = snapshot.docs[0];
    await userDoc.ref.update({
      firebase_uid: uid,
      provider: provider,
      // Also update name from provider, in case it has changed
      name: displayName,
    });
    return userDoc.id;
  } else {
    // User does not exist, create a new one
    const newUserRef = await usersRef.add({
      firebase_uid: uid,
      email: email,
      name: displayName,
      provider: provider,
      roles: ['User'], // Assign a default role
      createdAt: new Date().toISOString(),
    });
    return newUserRef.id;
  }
};

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { idToken } = req.body;

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    // This now returns the Firestore document ID
    const docId = await registerUserWithProvider(uid, email, name, 'google');

    // Fetch the full user profile from Firestore to get roles, etc.
    const userDoc = await adminDb.collection('users').doc(docId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User record not found in database.' });
    }
    const userData = userDoc.data();

    // Create a JWT token that includes the user's roles and other details
    const tokenPayload = {
      uid,
      email: userData.email,
      roles: userData.roles || [],
      groupIds: userData.groupIds || [],
      docId: userDoc.id,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    res.setHeader('Set-Cookie', serialize('auth_token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: 'strict',
    }));

    res.status(200).json({
        message: "Authentication successful",
        user: tokenPayload
    });

  } catch (error) {
    console.error('Login with Google error:', error);
    res.status(401).json({ message: 'Authentication failed', error: error.message });
  }
};
