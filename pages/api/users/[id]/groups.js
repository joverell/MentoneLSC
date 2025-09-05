import { adminDb, adminAuth } from '../../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

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
    const { groupIds } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    if (!Array.isArray(groupIds)) {
      return res.status(400).json({ message: 'A groupIds array is required.' });
    }

    // 2. Update the user document in Firestore with the array of group IDs
    const userDocRef = adminDb.collection('users').doc(userId);
    await userDocRef.update({ groupIds: groupIds });

    // 3. Update the custom claims in Firebase Auth with the array of group IDs
    // We need to merge the new groups with existing claims like roles
    const { customClaims } = await adminAuth.getUser(userId);
    await adminAuth.setCustomUserClaims(userId, { ...customClaims, groupIds: groupIds });

    return res.status(200).json({ message: 'User groups updated successfully.' });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Update User Groups API Error:', error);
    res.status(500).json({ message: 'An error occurred while updating user groups' });
  }
}
