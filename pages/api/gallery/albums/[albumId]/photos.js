import { adminDb } from '../../../../../src/firebase-admin';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const cookies = parseCookie(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        const { albumId } = req.query;
        if (!albumId) {
            return res.status(400).json({ message: 'Album ID is required.' });
        }

        const { downloadURL, caption } = req.body;
        if (!downloadURL) {
            return res.status(400).json({ message: 'downloadURL is required.' });
        }

        const albumRef = adminDb.collection('photo_albums').doc(albumId);
        const newPhotoRef = albumRef.collection('photos').doc();

        await newPhotoRef.set({
            caption: caption || '',
            downloadURL,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: decoded.userId,
        });

        const albumSnap = await albumRef.get();
        if (!albumSnap.data().coverImageUrl) {
            await albumRef.update({ coverImageUrl: downloadURL });
        }

        return res.status(201).json({ message: 'Photo added to album successfully.' });

    } catch (error) {
        console.error('Add Photo to Album Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred while adding the photo.' });
    }
}
