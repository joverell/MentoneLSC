import { adminDb, adminAuth } from '../../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to get IDs from an array of names by querying a collection
async function getIdsFromNames(collectionName, names) {
  if (!names || names.length === 0) {
    return [];
  }
  const collRef = adminDb.collection(collectionName);
  const q = collRef.where('name', 'in', names);
  const snapshot = await q.get();
  return snapshot.docs.map(doc => doc.id);
}

const handleGetRequest = async (req, res) => {
  const { id: userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  // Fetch the specific user from Firestore
  const userDocRef = adminDb.collection('users').doc(userId);
  const userDoc = await userDocRef.get();

  if (!userDoc.exists) {
    return res.status(404).json({ message: 'User not found' });
  }
  const userData = userDoc.data();

  // Fetch the corresponding IDs for the user's roles and groups
  const roleIds = await getIdsFromNames('roles', userData.roles);

  let finalGroupIds = [];
  if (userData.groupIds) {
    finalGroupIds = userData.groupIds;
  } else if (userData.groups) {
    finalGroupIds = await getIdsFromNames('access_groups', userData.groups);
  }

  // Return the full user data, including new fields
  res.status(200).json({
    id: userDoc.id,
    name: userData.name,
    email: userData.email,
    roles: userData.roles,
    roleIds: roleIds,
    groupIds: finalGroupIds,
    patrolQualifications: userData.patrolQualifications || '',
    emergencyContact: userData.emergencyContact || '',
    uniformSize: userData.uniformSize || '',
  });
};

const handlePutRequest = async (req, res, decoded) => {
    const { id: userId } = req.query;
    const { name, email, patrolQualifications, emergencyContact, uniformSize, roles } = req.body;

    // Authorization: Either admin or the user themselves
    const isSuperAdmin = decoded.isSuperAdmin === true;
    const isAdmin = decoded.roles && decoded.roles.includes('Admin');
    if (!isAdmin && decoded.uid !== userId) {
        return res.status(403).json({ message: 'Forbidden: You can only update your own profile.' });
    }

    try {
        const userDocRef = adminDb.collection('users').doc(userId);
        const updateData = {
            patrolQualifications,
            emergencyContact,
            uniformSize,
        };

        // Only admins or users updating their own name/email can change them.
        // Also ensure email updates are propagated to Firebase Auth.
        if (isAdmin || decoded.uid === userId) {
            if (name) updateData.name = name;
            if (email) {
                updateData.email = email;
                // Update Firebase Auth email
                await adminAuth.updateUser(userId, { email });
            }
        }

        // Only Super Admins can manage roles
        if (roles && isSuperAdmin) {
            updateData.roles = roles;
        }

        await userDocRef.update(updateData);
        res.status(200).json({ message: 'User profile updated successfully.' });

    } catch (error) {
        console.error('Update User API Error:', error);
        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({ message: 'The email address is already in use by another account.' });
        }
        res.status(500).json({ message: 'An error occurred while updating user data' });
    }
};

const handleDeleteRequest = async (req, res, decoded) => {
  const { id: userId } = req.query;

  // Authorization: Only admins can delete users
  const isAdmin = decoded.roles && decoded.roles.includes('Admin');
  if (!isAdmin) {
    return res.status(403).json({ message: 'Forbidden: You do not have permission to delete users.' });
  }

  try {
    // 1. Delete from Firebase Auth
    await adminAuth.deleteUser(userId);

    // 2. Delete from Firestore 'users' collection
    await adminDb.collection('users').doc(userId).delete();

    // 3. Remove user from all access groups
    const groupsRef = adminDb.collection('access_groups');
    const snapshot = await groupsRef.where('members', 'array-contains', userId).get();

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
        const groupRef = adminDb.collection('access_groups').doc(doc.id);
        batch.update(groupRef, {
            members: adminDb.FieldValue.arrayRemove(userId)
        });
    });
    await batch.commit();

    res.status(200).json({ message: 'User deleted successfully.' });

  } catch (error) {
    console.error('Delete User API Error:', error);
    if (error.code === 'auth/user-not-found') {
        // If user is not in Auth, maybe they were already deleted.
        // Proceed to delete from Firestore just in case.
        try {
            await adminDb.collection('users').doc(userId).delete();
            return res.status(200).json({ message: 'User deleted from Firestore (was not in Auth).' });
        } catch (dbError) {
            console.error('Error deleting user from Firestore after Auth error:', dbError);
            return res.status(500).json({ message: 'An error occurred while deleting user data.' });
        }
    }
    res.status(500).json({ message: 'An error occurred while deleting the user.' });
  }
};


export default async function handler(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    switch (req.method) {
      case 'GET':
        // Admin-only for GET request to see full user details
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to access this resource.' });
        }
        return await handleGetRequest(req, res);
      case 'PUT':
        return await handlePutRequest(req, res, decoded);
      case 'DELETE':
        return await handleDeleteRequest(req, res, decoded);
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('User API Error:', error);
    res.status(500).json({ message: 'An error occurred' });
  }
}
