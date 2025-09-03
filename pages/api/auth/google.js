import { admin } from '../../../src/firebase-admin';
import { serialize } from 'cookie';
import db from '../../../src/db';

const registerUserWithProvider = (uid, email, displayName, provider) => {
  const checkStmt = db.prepare('SELECT * FROM users WHERE email = ?');
  const existingUser = checkStmt.get(email);

  if (existingUser) {
    const updateStmt = db.prepare('UPDATE users SET firebase_uid = ?, provider = ? WHERE id = ?');
    updateStmt.run(uid, provider, existingUser.id);
    return existingUser.id;
  } else {
    const insertStmt = db.prepare('INSERT INTO users (firebase_uid, email, name, provider) VALUES (?, ?, ?, ?)');
    const result = insertStmt.run(uid, email, displayName, provider);
    return result.lastInsertRowid;
  }
};

export default async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { idToken } = req.body;

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name } = decodedToken;

    const userId = registerUserWithProvider(uid, email, name, 'google');

    const userRecord = { uid, email, name, id: userId };

    const token = await admin.auth().createCustomToken(uid);

    res.setHeader('Set-Cookie', serialize('token', token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      sameSite: 'strict',
    }));

    res.status(200).json(userRecord);
  } catch (error) {
    console.error('Login with Google error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
};
