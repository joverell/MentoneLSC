import { decrypt, encrypt } from '../../../../lib/crypto';
import { adminDb } from '../../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

// Helper function to get IDs from an array of names by querying a collection
async function getIdsFromNames(collectionName, names) {
  if (!names || names.length === 0) {
    return [];
  }
  const collRef = adminDb.collection(collectionName);
  const q = collRef.where('name', 'in', names);
  const snapshot = await q.get();
  return snapshot.docs.map(doc => doc.id);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // 1. Authenticate and Authorize the user as Admin
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.roles || !decoded.roles.includes('Admin')) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this resource.' });
    }

    const { id: encryptedId } = req.query;
    const userId = decrypt(encryptedId);

    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // 2. Fetch the specific user from Firestore
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userData = userDoc.data();

    // 3. Fetch the corresponding IDs for the user's roles and groups
    const roleIds = await getIdsFromNames('roles', userData.roles);
    const groupIds = await getIdsFromNames('access_groups', userData.groups);

    // 4. Return the response in the original format
    res.status(200).json({
      id: encrypt(userDoc.id),
      name: userData.name,
      email: userData.email,
      roleIds: roleIds.map(encrypt),
      groupIds: groupIds.map(encrypt),
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Get User API Error:', error);
    res.status(500).json({ message: 'An error occurred while fetching user data' });
  }
}
