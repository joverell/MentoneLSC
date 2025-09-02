import { encrypt } from '../../../lib/crypto';
import { db } from '../../../src/firebase'; // Import Firestore instance
import { collection, getDocs, addDoc, doc, getDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
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
  try {
    const newsCollection = collection(db, 'news');
    const q = query(newsCollection, orderBy('createdAt', 'desc'));
    const newsSnapshot = await getDocs(q);

    const articles = newsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Encrypt IDs for consistency with the old API
    const encryptedArticles = articles.map(article => ({
      ...article,
      id: encrypt(article.id),
      created_by: encrypt(article.created_by),
    }));

    return res.status(200).json(encryptedArticles);
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

    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Missing required fields: title and content' });
    }

    // Fetch author's name from 'users' collection to denormalize data
    const userDocRef = doc(db, 'users', String(userId)); // Ensure userId is a string for the doc path
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
        return res.status(404).json({ message: 'User not found' });
    }
    const authorName = userDoc.data().name;


    const newsCollection = collection(db, 'news');
    const newArticleRef = await addDoc(newsCollection, {
      title,
      content,
      created_by: userId,
      authorName, // Denormalized author's name
      createdAt: serverTimestamp(),
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
