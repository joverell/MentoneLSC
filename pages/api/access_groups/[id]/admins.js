import { adminDb } from '../../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import admin from 'firebase-admin';

const JWT_SECRET = process.env.JWT_SECRET;

// Only a "Super Admin" can modify group admins.
// We'll check for the isSuperAdmin custom claim.
function authorizeSuperAdmin(req) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.isSuperAdmin === true) {
      return decoded;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  const superAdminUser = authorizeSuperAdmin(req);
  if (!superAdminUser) {
    return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
  }

  const { id: groupId } = req.query;
  const { userId } = req.body;

  if (!groupId || !userId) {
    return res.status(400).json({ message: 'Group ID and User ID are required.' });
  }

  const groupRef = adminDb.collection('access_groups').doc(groupId);

  switch (req.method) {
    case 'POST': // Add user to group admins
      try {
        await groupRef.update({
          admins: admin.firestore.FieldValue.arrayUnion(userId)
        });
        return res.status(200).json({ message: 'User added to group admins successfully.' });
      } catch (error) {
        console.error('Add group admin error:', error);
        return res.status(500).json({ message: 'Failed to add group admin.' });
      }

    case 'DELETE': // Remove user from group admins
      try {
        await groupRef.update({
          admins: admin.firestore.FieldValue.arrayRemove(userId)
        });
        return res.status(200).json({ message: 'User removed from group admins successfully.' });
      } catch (error) {
        console.error('Remove group admin error:', error);
        return res.status(500).json({ message: 'Failed to remove group admin.' });
      }

    default:
      res.setHeader('Allow', ['POST', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
