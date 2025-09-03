import { encrypt } from '../../../lib/crypto';
import { db } from '../../../src/firebase'; // Import Firestore instance
import { adminDb } from '../../../src/firebase-admin';
import admin from 'firebase-admin';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = 'a-secure-and-long-secret-key-that-is-at-least-32-characters';

export default function handler(req, res) {
  if (req.method === 'GET') {
    return getNews(req, res);
  } else if (req.method === 'POST') {
    return createNews(req, res);
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Function to get all news articles from Firestore
async function getNews(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;
  let user = null;

  if (token) {
      try {
          user = jwt.verify(token, JWT_SECRET);
      } catch (e) {
          console.warn("Invalid auth token on news fetch");
      }
  }

  try {
    const newsCollection = collection(db, 'news');
    const q = query(newsCollection, orderBy('createdAt', 'desc'));
    const newsSnapshot = await getDocs(q);

    const articles = newsSnapshot.docs.map(doc => {
        const data = doc.data();

        const isPublic = !data.visibleToGroups || data.visibleToGroups.length === 0;
        const isAdmin = user && user.roles && user.roles.includes('Admin');

        let canView = isPublic || isAdmin;

        if (!canView && user && user.groupIds) {
            const userGroups = new Set(user.groupIds);
            const articleGroups = new Set(data.visibleToGroups);
            for (const group of articleGroups) {
                if (userGroups.has(group)) {
                    canView = true;
                    break;
                }
            }
        }

        if (!canView) return null;

        const likes = data.likes || [];
        const currentUserHasLiked = user ? likes.includes(user.userId) : false;

        return {
            id: encrypt(doc.id),
            title: data.title,
            content: data.content,
            authorName: data.authorName,
            createdAt: data.createdAt.toDate().toISOString(),
            likeCount: data.likeCount || 0,
            currentUserHasLiked: currentUserHasLiked,
        };
    }).filter(Boolean); // Filter out null values

    return res.status(200).json(articles);
  } catch (error) {
    console.error('Failed to fetch news:', error);
    return res.status(500).json({ message: 'An error occurred while fetching news articles.' });
  }
}

// Function to create a new news article in Firestore (protected)
async function createNews(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Authorize the user
    if (!decoded.roles || !decoded.roles.includes('Admin')) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to create articles.' });
    }

    const userId = decoded.userId;

    const { title, content, visibleToGroups } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Missing required fields: title and content' });
    }

    // Fetch author's name from 'users' collection to denormalize data
    const userDocRef = adminDb.collection('users').doc(String(userId));
    const userDoc = await userDocRef.get();
    if (!userDoc.exists) {
        return res.status(404).json({ message: 'User not found' });
    }
    const authorName = userDoc.data().name;


    const newArticleRef = await adminDb.collection('news').add({
      title,
      content,
      created_by: userId,
      authorName, // Denormalized author's name
      visibleToGroups: visibleToGroups || [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),

    });

    return res.status(201).json({
      message: 'News article created successfully',
      articleId: encrypt(newArticleRef.id),
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('News Creation Error:', error);
    return res.status(500).json({ message: 'An error occurred during news creation' });
  }
}
