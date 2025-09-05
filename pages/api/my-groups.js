import { adminDb } from '../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // 1. Authenticate the user
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const groupNames = decoded.groups || [];

    let fetchedGroups = [];
    if (groupNames.length > 0) {
        // 2. Fetch the access groups documents based on the names in the token
        const groupsCollection = adminDb.collection('access_groups');
        const q = groupsCollection.where('name', 'in', groupNames);
        const groupsSnapshot = await q.get();

        fetchedGroups = groupsSnapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name,
        }));
    }

    const generalGroup = { id: 'general', name: 'General' };

    // Sort fetched groups
    fetchedGroups.sort((a, b) => a.name.localeCompare(b.name));

    const allGroups = [generalGroup, ...fetchedGroups];

    return res.status(200).json(allGroups);

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Get My Groups API Error:', error);
    res.status(500).json({ message: 'An error occurred while fetching your groups' });
  }
}
