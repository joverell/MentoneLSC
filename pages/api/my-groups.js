import { encrypt } from '../../lib/crypto';
import db from '../../lib/db';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

export default function handler(req, res) {
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
    const userId = decoded.userId;

    // 2. Fetch the access groups for the user
    const stmt = db.prepare(`
      SELECT
        ag.id,
        ag.name
      FROM
        access_groups ag
      JOIN
        user_access_groups uag ON ag.id = uag.group_id
      WHERE
        uag.user_id = ?
      ORDER BY
        ag.name ASC
    `);

    const groups = stmt.all(userId);
    const encryptedGroups = groups.map(group => ({
      ...group,
      id: encrypt(group.id),
    }));

    return res.status(200).json(encryptedGroups);

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Get My Groups API Error:', error);
    res.status(500).json({ message: 'An error occurred while fetching your groups' });
  }
}
