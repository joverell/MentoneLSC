import db from '../../../lib/db';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

export default function handler(req, res) {
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

    // 2. Fetch all users with their roles and groups
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
      GROUP BY
        u.id
      ORDER BY
        u.name ASC
    `);

    const users = stmt.all().map(user => ({
      ...user,
      roles: user.roles ? user.roles.split(',') : [],
      groups: user.groups ? user.groups.split(',') : [],
    }));

    return res.status(200).json(users);

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Get Users API Error:', error);
    res.status(500).json({ message: 'An error occurred while fetching users' });
  }
}
