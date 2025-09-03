import { adminDb } from '../../../../src/firebase-admin';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
    if (req.method === 'GET') {
        return getAlbums(req, res);
    } else if (req.method === 'POST') {
        return createAlbum(req, res);
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

async function getAlbums(req, res) {
    try {
        const albumsSnapshot = await adminDb.collection('photo_albums').orderBy('createdAt', 'desc').get();
        const albums = albumsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate().toISOString(),
        }));
        return res.status(200).json(albums);
    } catch (error) {
        console.error('Get Albums Error:', error);
        return res.status(500).json({ message: 'An error occurred while fetching albums.' });
    }
}

async function createAlbum(req, res) {
    // Authenticate and Authorize Admin
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        const { title, description } = req.body;
        if (!title) {
            return res.status(400).json({ message: 'Album title is required.' });
        }

        const newAlbumRef = await adminDb.collection('photo_albums').add({
            title,
            description: description || '',
            coverImageUrl: null, // Will be set when the first photo is uploaded
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: decoded.uid,
        });

        return res.status(201).json({ message: 'Album created successfully.', albumId: newAlbumRef.id });

    } catch (error) {
        console.error('Create Album Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred during album creation.' });
    }
}
