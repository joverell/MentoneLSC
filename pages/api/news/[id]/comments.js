import { db } from '../../../../src/firebase';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

function decrypt(encryptedId) {
  try {
    const decoded = jwt.verify(encryptedId, JWT_SECRET);
    return decoded.id;
  } catch (error) {
    console.error("Error decrypting ID", error);
    return null;
  }
}

export default async function handler(req, res) {
  const { id: encryptedArticleId } = req.query;

  if (!encryptedArticleId) {
    return res.status(400).json({ message: 'Article ID is required.' });
  }

  try {
    const articleId = decrypt(encryptedArticleId);

    if (!articleId) {
      return res.status(400).json({ message: 'Invalid article ID' });
    }

    if (req.method === 'GET') {
      return getComments(req, res, articleId);
    } else if (req.method === 'POST') {
      return createComment(req, res, articleId);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
      console.error("Error decrypting article ID", error);
      return res.status(400).json({ message: 'Invalid Article ID.' });
  }
}

async function getComments(req, res, articleId) {
  try {
    const commentsCollectionRef = collection(db, 'news', articleId, 'comments');
    const q = query(commentsCollectionRef, orderBy('createdAt', 'asc'));
    const commentsSnapshot = await getDocs(q);

    const comments = commentsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            content: data.content,
            authorId: data.authorId,
            authorName: data.authorName,
            createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        }
    });

    return res.status(200).json(comments);
  } catch (error) {
    console.error(`Failed to fetch comments for article ${articleId}:`, error);
    return res.status(500).json({ message: 'An error occurred while fetching comments.' });
  }
}

async function createComment(req, res, articleId) {
  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { content } = req.body;
    if (!content || typeof content !== 'string' || content.trim() === '') {
      return res.status(400).json({ message: 'Comment content cannot be empty.' });
    }

    // Fetch author's name to denormalize
    const userDocRef = doc(db, 'users', String(userId));
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
        return res.status(404).json({ message: 'User not found' });
    }
    const authorName = userDoc.data().name || 'Anonymous';


    const commentsCollectionRef = collection(db, 'news', articleId, 'comments');
    const newCommentRef = await addDoc(commentsCollectionRef, {
      content: content.trim(),
      authorId: userId,
      authorName: authorName,
      createdAt: serverTimestamp(),
    });

    // We can return the new comment data if needed, including the generated ID
    const newComment = {
        id: newCommentRef.id,
        content: content.trim(),
        authorId: userId,
        authorName: authorName,
        createdAt: new Date().toISOString(), // Approximate timestamp for immediate feedback
    };

    return res.status(201).json(newComment);

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error(`Comment creation error for article ${articleId}:`, error);
    return res.status(500).json({ message: 'An error occurred during comment creation.' });
  }
}
