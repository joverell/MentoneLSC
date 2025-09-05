import { adminDb } from '../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import admin from 'firebase-admin';

const JWT_SECRET = process.env.JWT_SECRET;

// Helper to authorize if the user is an admin or a group admin for the news article
async function authorize(req, articleId) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    // Super Admins can do anything
    if (decoded.roles && decoded.roles.includes('Admin')) {
      return { authorized: true, user: decoded };
    }

    const isGroupAdminRole = decoded.roles && decoded.roles.includes('Group Admin');
    if (!isGroupAdminRole) {
        return null; // Not a group admin, so can't proceed
    }

    // Check if the user is a group admin for the article
    const articleRef = adminDb.collection('news').doc(articleId);
    const articleDoc = await articleRef.get();
    if (!articleDoc.exists) return null;

    const articleData = articleDoc.data();
    const articleGroups = articleData.visibleToGroups || [];
    if (articleGroups.length === 0) return null; // Only super admins can manage public articles

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) return null;

    const userAdminGroups = userDoc.data().adminForGroups || [];
    const canAdminArticle = articleGroups.some(groupId => userAdminGroups.includes(groupId));

    if (canAdminArticle) {
        return { authorized: true, user: decoded }; // Authorized as a group admin
    }

    return null; // Not authorized
  } catch (error) {
    console.error("Authorization error:", error);
    return null;
  }
}

export default async function handler(req, res) {
  const { id } = req.query;

  const authResult = await authorize(req, id);

  if (!authResult || !authResult.authorized) {
    return res.status(403).json({ message: 'Forbidden: You do not have permission to perform this action.' });
  }

  switch (req.method) {
    case 'PUT':
      return updateNews(req, res, id);
    case 'DELETE':
      return deleteNews(req, res, id);
    default:
      res.setHeader('Allow', ['PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function updateNews(req, res, articleId) {
  const { title, content, imageUrl, visibleToGroups } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const articleRef = adminDb.collection('news').doc(articleId);
    await articleRef.update({
      title,
      content,
      imageUrl: imageUrl || null,
      visibleToGroups: visibleToGroups || [],
    });
    res.status(200).json({ message: 'News article updated successfully.' });
  } catch (error) {
    console.error(`Error updating news article ${articleId}:`, error);
    res.status(500).json({ message: 'An error occurred while updating the news article.' });
  }
}

async function deleteNews(req, res, articleId) {
  try {
    const articleRef = adminDb.collection('news').doc(articleId);
    await articleRef.delete();
    res.status(200).json({ message: 'News article deleted successfully.' });
  } catch (error) {
    console.error(`Error deleting news article ${articleId}:`, error);
    res.status(500).json({ message: 'An error occurred while deleting the news article.' });
  }
}
