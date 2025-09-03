import { adminDb, adminAuth } from '../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

// Helper to authorize if the user is an admin
function authorizeAdmin(req) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.roles && decoded.roles.includes('Admin')) {
      return decoded;
    }
    return null;
  } catch (error) {
    return null;
  }
}

export default async function handler(req, res) {
  const { id } = req.query;

  // For PUT requests, the user can be an admin or themselves.
  if (req.method === 'PUT') {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles.includes('Admin') && decoded.uid !== id) {
            return res.status(403).json({ message: 'Forbidden: You can only update your own profile.' });
        }
        return await handlePutRequest(req, res, decoded);
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
  }

  // For GET and DELETE, user must be an admin
  const adminUser = authorizeAdmin(req);
  if (!adminUser) {
    return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
  }

  switch (req.method) {
    case 'GET':
      return getUser(req, res, id);
    case 'DELETE':
      return deleteUser(req, res, id);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function getUser(req, res, userId) {
  try {
    const userRef = adminDb.collection('users').doc(userId);
    const doc = await userRef.get();
    if (!doc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userData = doc.data();
    res.status(200).json({
      id: doc.id,
      name: userData.name,
      email: userData.email,
      roles: userData.roles || [],
      groupIds: userData.groupIds || [],
      patrolQualifications: userData.patrolQualifications || '',
      emergencyContact: userData.emergencyContact || '',
      uniformSize: userData.uniformSize || '',
    });
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    res.status(500).json({ message: 'An error occurred while fetching user details.' });
  }
}

async function handlePutRequest(req, res, decoded) {
    const { id: userId } = req.query;
    const { name, email, patrolQualifications, emergencyContact, uniformSize, roles, groupIds } = req.body;
    const isSuperAdmin = decoded.isSuperAdmin === true;

    try {
        const userDocRef = adminDb.collection('users').doc(userId);
        const updateData = {};

        // These fields can be updated by the user themselves or an admin
        if(patrolQualifications) updateData.patrolQualifications = patrolQualifications;
        if(emergencyContact) updateData.emergencyContact = emergencyContact;
        if(uniformSize) updateData.uniformSize = uniformSize;
        if(name) updateData.name = name;

        // Only update email if it has changed, and propagate to Firebase Auth
        if (email) {
            const currentUser = await adminAuth.getUser(userId);
            if(currentUser.email !== email){
                await adminAuth.updateUser(userId, { email });
                updateData.email = email;
            }
        }

        // Only Super Admins can manage roles and groups
        if (isSuperAdmin) {
            if (roles) updateData.roles = roles;
            if (groupIds) updateData.groupIds = groupIds;
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

async function deleteUser(req, res, userId) {
  try {
    // Delete from Firestore
    await adminDb.collection('users').doc(userId).delete();

    // Delete from Firebase Authentication
    await adminAuth.deleteUser(userId);

    res.status(200).json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error(`Error deleting user ${userId}:`, error);
    if (error.code === 'auth/user-not-found') {
        // If the user is already deleted from Auth but not Firestore,
        // we can consider the operation a success for the client.
        return res.status(200).json({ message: 'User was already deleted from authentication.' });
    }
    res.status(500).json({ message: 'An error occurred while deleting the user.' });
  }
}
