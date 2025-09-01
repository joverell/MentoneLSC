import { encrypt } from '../../../lib/crypto';
import { getDb } from '../../../lib/db';
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

export default function handler(req, res) {
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

function getAccessGroups(req, res) {
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT * FROM access_groups ORDER BY name ASC');
    const groups = stmt.all();
    const encryptedGroups = groups.map(group => ({
      ...group,
      id: encrypt(group.id),
    }));
    return res.status(200).json(encryptedGroups);
  } catch (error) {
    console.error('Get Access Groups API Error:', error);
    return res.status(500).json({ message: 'An error occurred while fetching access groups' });
  }
}

function createAccessGroup(req, res) {
  const db = getDb();
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Group name is required.' });
  }

  try {
    const stmt = db.prepare('INSERT INTO access_groups (name) VALUES (?)');
    const info = stmt.run(name);
    return res.status(201).json({
      message: 'Access group created successfully.',
      groupId: encrypt(info.lastInsertRowid),
    });
  } catch (error) {
    // Handle unique constraint violation
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'An access group with this name already exists.' });
    }
    console.error('Create Access Group API Error:', error);
    return res.status(500).json({ message: 'An error occurred while creating the access group.' });
  }
}
