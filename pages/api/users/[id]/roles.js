import { decrypt } from '../../../../lib/crypto';
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

    const { id: encryptedUserId } = req.query;
    const { roleIds: encryptedRoleIds } = req.body;

    const userId = decrypt(encryptedUserId);
    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    if (!Array.isArray(encryptedRoleIds)) {
      return res.status(400).json({ message: 'A roles array is required.' });
    }

    const roleIds = encryptedRoleIds.map(decrypt).filter(Boolean);
    if (roleIds.length !== encryptedRoleIds.length) {
      return res.status(400).json({ message: 'Invalid role ID found in the array.' });
    }

    // 2. Use a transaction to update roles
    const updateRoles = db.transaction((uid, rIds) => {
      // Delete existing roles for the user
      db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(uid);

      // Insert new roles
      const insertStmt = db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)');
      rIds.forEach(roleId => {
        insertStmt.run(uid, roleId);
      });
      return { success: true };
    });

    const result = updateRoles(userId, roleIds);

    if (result.success) {
      return res.status(200).json({ message: 'User roles updated successfully.' });
    } else {
      // This part should ideally not be reached if transaction is set up correctly
      throw new Error('Transaction failed');
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Update User Roles API Error:', error);
    res.status(500).json({ message: 'An error occurred while updating user roles' });
  }
}
