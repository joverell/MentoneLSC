import { adminDb } from '../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

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

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: 'Invalid ID' });
  }

  // Check if the document exists before proceeding
  const docRef = adminDb.collection('access_groups').doc(id);
  const docSnap = await docRef.get();

  if (!docSnap.exists) {
    return res.status(404).json({ message: 'Access group not found.' });
  }

  if (req.method === 'PUT') {
    return updateAccessGroup(req, res, docRef);
  } else if (req.method === 'DELETE') {
    return deleteAccessGroup(req, res, docRef);
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function updateAccessGroup(req, res, docRef) {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Group name is required.' });
  }

  try {
    // Check for uniqueness before updating
    const groupsCollection = adminDb.collection('access_groups');
    const q = groupsCollection.where('name', '==', name);
    const existing = await q.get();
    if (!existing.empty && existing.docs[0].id !== docRef.id) {
        return res.status(409).json({ message: 'An access group with this name already exists.' });
    }

    await docRef.update({ name });
    return res.status(200).json({ message: 'Access group updated successfully.' });

  } catch (error) {
    console.error('Update Access Group API Error:', error);
    return res.status(500).json({ message: 'An error occurred while updating the access group.' });
  }
}

async function deleteAccessGroup(req, res, docRef) {
  try {
    await docRef.delete();
    return res.status(200).json({ message: 'Access group deleted successfully.' });
  } catch (error) {
    console.error('Delete Access Group API Error:', error);
    return res.status(500).json({ message: 'An error occurred while deleting the access group.' });
  }
}
