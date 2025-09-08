import { adminDb } from '../../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import admin from 'firebase-admin';

const JWT_SECRET = process.env.JWT_SECRET;

function authorizeAdmin(req) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.roles && decoded.roles.includes('Admin')) {
      return decoded;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  const adminUser = authorizeAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
  }

  const { id: groupId } = req.query;

  if (req.method === 'POST') {
    const { userId } = req.body;
    if (!groupId || !userId) {
      return res.status(400).json({ message: 'Group ID and User ID are required.' });
    }
    try {
      const userRef = adminDb.collection('users').doc(userId);
      await userRef.update({
        groupIds: admin.firestore.FieldValue.arrayUnion(groupId)
      });
      return res.status(200).json({ message: 'User added to group successfully.' });
    } catch (error) {
      console.error('Add user to group error:', error);
      return res.status(500).json({ message: 'Failed to add user to group.' });
    }
  } else if (req.method === 'DELETE') {
    const { userId } = req.body;
    if (!groupId || !userId) {
      return res.status(400).json({ message: 'Group ID and User ID are required.' });
    }
    try {
      const userRef = adminDb.collection('users').doc(userId);
      await userRef.update({
        groupIds: admin.firestore.FieldValue.arrayRemove(groupId)
      });
      return res.status(200).json({ message: 'User removed from group successfully.' });
    } catch (error) {
      console.error('Remove user from group error:', error);
      return res.status(500).json({ message: 'Failed to remove user from group.' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
