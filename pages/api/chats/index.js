import { adminDb } from '../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userGroupIds = userDoc.data().groupIds || [];

    const publicChatsSnapshot = await adminDb.collection('chats').where('type', '==', 'public').get();
    const privateChatsSnapshot = await adminDb.collection('chats').where('type', '==', 'private').where('members', 'array-contains', userId).get();
    const restrictedChatsSnapshot = await adminDb.collection('chats').where('type', '==', 'restricted').where('groups', 'array-contains-any', userGroupIds).get();

    const chats = [];
    publicChatsSnapshot.forEach(doc => chats.push({ id: doc.id, ...doc.data() }));
    privateChatsSnapshot.forEach(doc => chats.push({ id: doc.id, ...doc.data() }));
    restrictedChatsSnapshot.forEach(doc => chats.push({ id: doc.id, ...doc.data() }));

    res.status(200).json(chats);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Error fetching chats:', error);
    res.status(500).json({ message: 'An internal server error occurred.' });
  }
}
