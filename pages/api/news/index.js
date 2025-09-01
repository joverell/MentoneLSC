import { encrypt } from '../../../lib/crypto';
import { getDb } from '../../../lib/db';
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

// Function to get all news articles, newest first
function getNews(req, res) {
  const db = getDb();
  try {
    const stmt = db.prepare('SELECT news.*, users.name as authorName FROM news JOIN users ON news.created_by = users.id ORDER BY news.createdAt DESC');
    const articles = stmt.all();
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

// Function to create a new news article (protected)
function createNews(req, res) {
  const db = getDb();
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

    const stmt = db.prepare(
      'INSERT INTO news (title, content, created_by) VALUES (?, ?, ?)'
    );
    const info = stmt.run(title, content, userId);

    return res.status(201).json({
      message: 'News article created successfully',
      articleId: encrypt(info.lastInsertRowid),
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('News Creation Error:', error);
    return res.status(500).json({ message: 'An error occurred during news creation' });
  }
}
