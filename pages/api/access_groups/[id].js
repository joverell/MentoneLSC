import db from '../../../lib/db';
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
    return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
  }

  if (req.method === 'PUT') {
    return updateAccessGroup(req, res);
  } else if (req.method === 'DELETE') {
    return deleteAccessGroup(req, res);
  } else {
    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

function updateAccessGroup(req, res) {
  const { id } = req.query;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Group name is required.' });
  }

  try {
    const stmt = db.prepare('UPDATE access_groups SET name = ? WHERE id = ?');
    const info = stmt.run(name, id);

    if (info.changes === 0) {
      return res.status(404).json({ message: 'Access group not found.' });
    }

    return res.status(200).json({ message: 'Access group updated successfully.' });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'An access group with this name already exists.' });
    }
    console.error('Update Access Group API Error:', error);
    return res.status(500).json({ message: 'An error occurred while updating the access group.' });
  }
}

function deleteAccessGroup(req, res) {
  const { id } = req.query;

  try {
    const stmt = db.prepare('DELETE FROM access_groups WHERE id = ?');
    const info = stmt.run(id);

    if (info.changes === 0) {
      return res.status(404).json({ message: 'Access group not found.' });
    }

    return res.status(200).json({ message: 'Access group deleted successfully.' });
  } catch (error) {
    console.error('Delete Access Group API Error:', error);
    return res.status(500).json({ message: 'An error occurred while deleting the access group.' });
  }
}
