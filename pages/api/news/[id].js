import { adminDb } from '../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

async function deleteCommentsSubcollection(articleId) {
    const commentsRef = adminDb.collection('news').doc(articleId).collection('comments');
    const snapshot = await commentsRef.get();

    if (snapshot.empty) {
        return;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
}

export default async function handler(req, res) {
    if (req.method !== 'DELETE') {
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to delete articles.' });
        }

        const { id: articleId } = req.query;

        if (!articleId) {
            return res.status(400).json({ message: 'Article ID is required.' });
        }

        // First, delete the 'comments' subcollection
        await deleteCommentsSubcollection(articleId);

        // Then, delete the main article document
        const articleRef = adminDb.collection('news').doc(articleId);
        await articleRef.delete();

        return res.status(200).json({ message: 'Article and associated comments deleted successfully.' });

    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        console.error('Delete News API Error:', error);
        return res.status(500).json({ message: 'An error occurred while deleting the article.' });
    }
}
