import { adminDb, adminAuth, adminStorage } from '../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import { parseForm } from '@/utils/fileUploadParser.js';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET;

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to authorize viewing or managing a user
async function authorizeUserAccess(req, targetUserId) {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return { authorized: false, reason: 'No token' };

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const requesterId = decoded.userId;

        // Users can always access their own profile
        if (requesterId === targetUserId) {
            return { authorized: true, user: decoded, level: 'self' };
        }

        // Super Admins can do anything
        if (decoded.roles && decoded.roles.includes('Admin')) {
            return { authorized: true, user: decoded, level: 'admin' };
        }

        // Group Admins can access users in their groups
        const isGroupAdmin = decoded.roles && decoded.roles.includes('Group Admin');
        if (isGroupAdmin) {
            const requesterDoc = await adminDb.collection('users').doc(requesterId).get();
            const targetUserDoc = await adminDb.collection('users').doc(targetUserId).get();

            if (!requesterDoc.exists || !targetUserDoc.exists) {
                return { authorized: false, reason: 'User not found' };
            }

            const requesterAdminGroups = requesterDoc.data().adminForGroups || [];
            const targetUserGroups = targetUserDoc.data().groupIds || [];

            const hasSharedGroup = requesterAdminGroups.some(adminGroup => targetUserGroups.includes(adminGroup));

            if (hasSharedGroup) {
                return { authorized: true, user: decoded, level: 'groupAdmin', adminGroups: requesterAdminGroups };
            }
        }

        return { authorized: false, reason: 'Insufficient permissions' };
    } catch (error) {
        return { authorized: false, reason: 'Invalid token' };
    }
}


export default async function handler(req, res) {
  const { id: targetUserId } = req.query;

  const authResult = await authorizeUserAccess(req, targetUserId);

  if (!authResult.authorized) {
    return res.status(403).json({ message: `Forbidden: ${authResult.reason}` });
  }

  switch (req.method) {
    case 'GET':
      return getUser(req, res, targetUserId);
    case 'PUT':
        return handlePutRequest(req, res, authResult);
    case 'DELETE':
        // Only full admins can delete users
        if (authResult.level !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Only full administrators can delete users.' });
        }
      return deleteUser(req, res, targetUserId);
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

async function handlePutRequest(req, res, authResult) {
    const { id: targetUserId } = req.query;
    const { level, adminGroups } = authResult;

    let tempFilePath;
    try {
        const { fields, files } = await parseForm(req);

        const photoFile = files.photo?.[0];
        let photoURL = fields.photoURL?.[0]; // Existing photo URL

        // If a new photo is uploaded, process it
        if (photoFile) {
            tempFilePath = photoFile.filepath;
            const bucket = adminStorage.bucket();
            const fileExt = photoFile.originalFilename.split('.').pop();
            const fileName = `${uuidv4()}.${fileExt}`;
            const destination = `profile-photos/${targetUserId}/${fileName}`;

            await bucket.upload(tempFilePath, {
                destination: destination,
                metadata: { contentType: photoFile.mimetype },
            });

            const fileRef = bucket.file(destination);
            const [url] = await fileRef.getSignedUrl({ action: 'read', expires: '03-09-2491' });
            photoURL = url; // Set the new photo URL
        }

        const userDocRef = adminDb.collection('users').doc(targetUserId);
        const updateData = { photoURL }; // Start with the photoURL

        // Extract text fields from the parsed form
        const name = fields.name?.[0];
        const email = fields.email?.[0];
        const patrolQualifications = fields.patrolQualifications?.[0];
        const emergencyContact = fields.emergencyContact?.[0];
        const uniformSize = fields.uniformSize?.[0];
        // Roles and groupIds might be arrays, handle them carefully
        const roles = fields.roles ? (Array.isArray(fields.roles) ? fields.roles : [fields.roles]) : undefined;
        const groupIds = fields.groupIds ? (Array.isArray(fields.groupIds) ? fields.groupIds : [fields.groupIds]) : undefined;
        // Notification settings is an object
        const notificationSettings = fields.notificationSettings ? JSON.parse(fields.notificationSettings[0]) : undefined;

        // Fields updatable by the user themselves or any admin level
        if (notificationSettings !== undefined) updateData.notificationSettings = notificationSettings;
        if (patrolQualifications !== undefined) updateData.patrolQualifications = patrolQualifications;
        if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact;
        if (uniformSize !== undefined) updateData.uniformSize = uniformSize;
        if (name !== undefined) updateData.name = name;

        // Email update
        if (email !== undefined) {
            const currentUser = await adminAuth.getUser(targetUserId);
            if (currentUser.email !== email) {
                await adminAuth.updateUser(targetUserId, { email });
                updateData.email = email;
            }
        }

        // Role and Group updates (with the same permission logic as before)
        if (level === 'admin') {
            if (roles !== undefined) updateData.roles = roles;
            if (groupIds !== undefined) updateData.groupIds = groupIds;
        } else if (level === 'groupAdmin') {
            if (groupIds !== undefined) {
                const targetUserDoc = await userDocRef.get();
                const currentGroupIds = targetUserDoc.data().groupIds || [];
                const otherGroups = currentGroupIds.filter(gId => !adminGroups.includes(gId));
                const managedGroups = groupIds.filter(gId => adminGroups.includes(gId));
                updateData.groupIds = [...new Set([...otherGroups, ...managedGroups])];
            }
            if (roles !== undefined) {
                return res.status(403).json({ message: 'Forbidden: You do not have permission to change user roles.' });
            }
        } else { // 'self'
            if (roles !== undefined || groupIds !== undefined) {
                return res.status(403).json({ message: 'Forbidden: You cannot change your own roles or group memberships.' });
            }
        }

        if (Object.keys(updateData).length > 0) {
            await userDocRef.update(updateData);
        }

        res.status(200).json({ message: 'User profile updated successfully.', photoURL });

    } catch (error) {
        console.error('Update User API Error:', error);
        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({ message: 'The email address is already in use by another account.' });
        }
        res.status(500).json({ message: 'An error occurred while updating user data' });
    } finally {
        if (tempFilePath) {
            try {
                fs.unlinkSync(tempFilePath);
            } catch (unlinkError) {
                console.error('Error deleting temporary file:', unlinkError);
            }
        }
    }
}

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
