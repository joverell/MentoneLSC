import { decrypt } from '../../../../lib/crypto';
import { adminDb, adminAuth } from '../../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

// Helper function to get group names from an array of group IDs
async function getGroupNamesFromIds(groupIds) {
  if (!groupIds || groupIds.length === 0) {
    return [];
  }
  const docRefs = groupIds.map(id => adminDb.collection('access_groups').doc(id));
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

    const { id: encryptedUserId } = req.query;
    const { groupIds: encryptedGroupIds } = req.body;

    const userId = decrypt(encryptedUserId);
    if (!userId) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    if (!Array.isArray(encryptedGroupIds)) {
      return res.status(400).json({ message: 'A groupIds array is required.' });
    }

    const groupIds = encryptedGroupIds.map(decrypt).filter(Boolean);
    if (groupIds.length !== encryptedGroupIds.length) {
      return res.status(400).json({ message: 'Invalid group ID found in the array.' });
    }

    // 2. Convert group IDs to group names
    const groupNames = await getGroupNamesFromIds(groupIds);
     if (groupNames.length !== groupIds.length) {
        return res.status(400).json({ message: 'One or more provided group IDs are invalid.' });
    }

    // 3. Update the user document in Firestore
    const userDocRef = adminDb.collection('users').doc(userId);
    await userDocRef.update({ groups: groupNames });

    // 4. Update the custom claims in Firebase Auth
    // We need to merge the new groups with existing claims like roles
    const { customClaims } = await adminAuth.getUser(userId);
    await adminAuth.setCustomUserClaims(userId, { ...customClaims, groups: groupNames });

    return res.status(200).json({ message: 'User groups updated successfully.' });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Update User Groups API Error:', error);
    res.status(500).json({ message: 'An error occurred while updating user groups' });
  }
}
