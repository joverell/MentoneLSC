import { encrypt } from '../../../lib/crypto';
import { adminDb } from '../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

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
    return res.status(403).json({ message: 'Forbidden: You do not have permission to access this resource.' });
  }

  if (req.method === 'GET') {
    return getAccessGroups(req, res);
  } else if (req.method === 'POST') {
    return createAccessGroup(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function getAccessGroups(req, res) {
  try {
    const groupsSnapshot = await adminDb.collection('access_groups').orderBy('name', 'asc').get();
    const groups = groupsSnapshot.docs.map(doc => ({
      id: encrypt(doc.id),
      ...doc.data(),
    }));
    return res.status(200).json(groups);
  } catch (error) {
    console.error('Get Access Groups API Error:', error);
    return res.status(500).json({ message: 'An error occurred while fetching access groups' });
  }
}

async function createAccessGroup(req, res) {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Group name is required.' });
  }

  try {
    // Check for uniqueness since Firestore doesn't enforce it
    const groupsCollection = adminDb.collection('access_groups');
    const q = groupsCollection.where('name', '==', name);
    const existing = await q.get();
    if (!existing.empty) {
      return res.status(409).json({ message: 'An access group with this name already exists.' });
    }

    const newGroupRef = await groupsCollection.add({ name });
    return res.status(201).json({
      message: 'Access group created successfully.',
      groupId: encrypt(newGroupRef.id),
    });
  } catch (error) {
    console.error('Create Access Group API Error:', error);
    return res.status(500).json({ message: 'An error occurred while creating the access group.' });
  }
}
