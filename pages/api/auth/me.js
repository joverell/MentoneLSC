import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { getDb } from '../../../lib/db';

const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

export default function handler(req, res) {
  const db = getDb();
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // Fetch user details, roles, and groups from the database
    const stmt = db.prepare(`
      SELECT
        u.id,
        u.name,
        u.email,
        GROUP_CONCAT(DISTINCT r.name) as roles,
        GROUP_CONCAT(DISTINCT ag.name) as groups
      FROM
        users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN user_access_groups uag ON u.id = uag.user_id
      LEFT JOIN access_groups ag ON uag.group_id = ag.id
      WHERE
        u.id = ?
      GROUP BY
        u.id
    `);

    const user = stmt.get(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Process roles and groups from comma-separated strings to arrays
    const roles = user.roles ? user.roles.split(',') : [];
    const groups = user.groups ? user.groups.split(',') : [];

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      roles,
      groups,
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Me API Error:', error);
    res.status(500).json({ message: 'An error occurred while fetching user data' });
  }
}
