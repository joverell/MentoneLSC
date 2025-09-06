import { adminDb } from '@/src/firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

// The config for bodyParser is no longer needed as we are not parsing multipart forms
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

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
        const { downloadURL, caption } = req.body;

        if (!downloadURL) {
            return res.status(400).json({ message: 'downloadURL is required.' });
        }

        // Extract the file name from the download URL
        const urlParts = downloadURL.split('?')[0].split('/');
        const fileName = urlParts[urlParts.length - 1];

        const photoData = {
            id: uuidv4(),
            albumId,
            fileName,
            caption: caption || '',
            downloadURL: downloadURL,
            uploadedAt: new Date().toISOString(),
            createdBy: decoded.userId,
        };

        const albumRef = adminDb.collection('gallery_albums').doc(albumId);
        const albumDoc = await albumRef.get();

        if (!albumDoc.exists) {
            return res.status(404).json({ message: 'Album not found' });
        }

        // Add photo data to the 'photos' subcollection
        await albumRef.collection('photos').add(photoData);

        // Optionally, update a 'lastUpdated' field or photo count on the album
        await albumRef.update({
            lastUpdated: new Date().toISOString(),
        });

        res.status(201).json(photoData);

    } catch (error) {
        console.error('Error creating photo entry:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        res.status(500).json({ message: 'An error occurred while creating the photo entry' });
    }
}
