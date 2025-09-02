import { encrypt } from '../../../lib/crypto';
import { adminDb } from '../../../src/firebase-admin';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

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

    // 2. Fetch all users from the Firestore 'users' collection
    const usersCollection = collection(adminDb, 'users');
    const q = query(usersCollection, orderBy('name', 'asc'));
    const usersSnapshot = await getDocs(q);

    const users = usersSnapshot.docs.map(doc => {
      const userData = doc.data();
      return {
        id: encrypt(doc.id),
        name: userData.name,
        email: userData.email,
        roles: userData.roles || [],
        groups: userData.groups || [],
      };
    });

    return res.status(200).json(users);

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Get Users API Error:', error);
    res.status(500).json({ message: 'An error occurred while fetching users' });
  }
}
