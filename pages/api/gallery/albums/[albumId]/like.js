import { adminDb } from '../../../../../src/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const cookies = parse(req.headers.cookie || '');
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    const { albumId } = req.query;
    if (!albumId) {
        return res.status(400).json({ message: 'Album ID is required.' });
    }

    const albumRef = adminDb.collection('photo_albums').doc(albumId);

    // Use a transaction to ensure atomic read/write
    const result = await adminDb.runTransaction(async (transaction) => {
      const albumDoc = await transaction.get(albumRef);
      if (!albumDoc.exists) {
        throw new Error('Album not found');
      }

      const albumData = albumDoc.data();
      const likes = albumData.likes || [];
      const userHasLiked = likes.includes(userId);

      if (userHasLiked) {
        // User is unliking the album
        transaction.update(albumRef, {
          likes: FieldValue.arrayRemove(userId),
          likeCount: FieldValue.increment(-1),
        });
        return { liked: false, newCount: (albumData.likeCount || 1) - 1 };
      } else {
        // User is liking the album
        transaction.update(albumRef, {
          likes: FieldValue.arrayUnion(userId),
          likeCount: FieldValue.increment(1),
        });
        return { liked: true, newCount: (albumData.likeCount || 0) + 1 };
      }
    });

    return res.status(200).json(result);

  } catch (error) {
    if (error.message === 'Album not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Like API Error:', error);
    return res.status(500).json({ message: 'An error occurred while processing your request.' });
  }
}
