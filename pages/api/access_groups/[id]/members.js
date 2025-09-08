import { adminDb } from '../../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import admin from 'firebase-admin';
import logger from '../../../../utils/server-logger';

const JWT_SECRET = process.env.JWT_SECRET;

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
    logger.error('Admin authorization error', { function: 'authorizeAdmin' }, error);
    return null;
  }
}

export default async function handler(req, res) {
  const context = { component: 'members-api', function: 'handler' };
  logger.info('API request received', context, { method: req.method, query: req.query, body: req.body });

  const adminUser = authorizeAdmin(req);
  if (!adminUser) {
    logger.warn('Forbidden access attempt', context, { ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress });
    return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
  }

  const { id: groupId } = req.query;

  if (req.method === 'POST') {
    const { userId } = req.body;
    logger.info('Attempting to add user to group', context, { userId, groupId });
    if (!groupId || !userId) {
      logger.warn('Missing groupId or userId for POST', context, { userId, groupId });
      return res.status(400).json({ message: 'Group ID and User ID are required.' });
    }
    try {
      const userRef = adminDb.collection('users').doc(userId);
      await userRef.update({
        groupIds: admin.firestore.FieldValue.arrayUnion(groupId)
      });
      logger.info('User added to group successfully', context, { userId, groupId });
      return res.status(200).json({ message: 'User added to group successfully.' });
    } catch (error) {
      logger.error('Add user to group error', context, { error, userId, groupId });
      return res.status(500).json({ message: 'Failed to add user to group.' });
    }
  } else if (req.method === 'DELETE') {
    const { userId } = req.query; // Changed from req.body
    logger.info('Attempting to remove user from group', context, { userId, groupId });
    if (!groupId || !userId) {
      logger.warn('Missing groupId or userId for DELETE', context, { userId, groupId });
      return res.status(400).json({ message: 'Group ID and User ID are required.' });
    }
    try {
      const userRef = adminDb.collection('users').doc(userId);
      await userRef.update({
        groupIds: admin.firestore.FieldValue.arrayRemove(groupId)
      });
      logger.info('User removed from group successfully', context, { userId, groupId });
      return res.status(200).json({ message: 'User removed from group successfully.' });
    } catch (error) {
      logger.error('Remove user from group error', context, { error, userId, groupId });
      return res.status(500).json({ message: 'Failed to remove user from group.' });
    }
  } else {
    logger.warn(`Method ${req.method} not allowed`, context);
    res.setHeader('Allow', ['POST', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
