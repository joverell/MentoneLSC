import { adminDb, adminAuth } from '../../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to get role names from an array of role IDs
async function getRoleNamesFromIds(roleIds) {
  if (!roleIds || roleIds.length === 0) {
    return [];
  }
  const docRefs = roleIds.map(id => adminDb.collection('roles').doc(id));
  const docSnapshots = await adminDb.getAll(...docRefs);
  return docSnapshots.map(doc => doc.exists ? doc.data().name : null).filter(Boolean);
}

export default async function handler(req, res) {
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
    const { roleIds } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    if (!Array.isArray(roleIds)) {
      return res.status(400).json({ message: 'A roleIds array is required.' });
    }

    // 2. Convert role IDs to role names
    const roleNames = await getRoleNamesFromIds(roleIds);
    if (roleNames.length !== roleIds.length) {
        // This means one of the provided role IDs was not found
        return res.status(400).json({ message: 'One or more provided role IDs are invalid.' });
    }

    // 3. Update the user document in Firestore
    const userDocRef = adminDb.collection('users').doc(userId);
    await userDocRef.update({ roles: roleNames });

    // 4. Update the custom claims in Firebase Auth for immediate effect on tokens
    await adminAuth.setCustomUserClaims(userId, { roles: roleNames });

    return res.status(200).json({ message: 'User roles updated successfully.' });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Update User Roles API Error:', error);
    res.status(500).json({ message: 'An error occurred while updating user roles' });
  }
}
