import db from '../../../../lib/db';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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
      return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
    }

    const { id: userId } = req.query;
    const { groupIds } = req.body;

    if (!userId || !Array.isArray(groupIds)) {
      return res.status(400).json({ message: 'User ID and a groups array are required.' });
    }

    // 2. Use a transaction to update groups
    const updateGroups = db.transaction((uid, gIds) => {
      // Delete existing groups for the user
      db.prepare('DELETE FROM user_access_groups WHERE user_id = ?').run(uid);

      // Insert new groups
      const insertStmt = db.prepare('INSERT INTO user_access_groups (user_id, group_id) VALUES (?, ?)');
      gIds.forEach(groupId => {
        insertStmt.run(uid, groupId);
      });
      return { success: true };
    });

    const result = updateGroups(userId, groupIds);

    if (result.success) {
      return res.status(200).json({ message: 'User groups updated successfully.' });
    } else {
      throw new Error('Transaction failed');
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Update User Groups API Error:', error);
    res.status(500).json({ message: 'An error occurred while updating user groups' });
  }
}
