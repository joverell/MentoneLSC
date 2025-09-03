import { adminDb, adminStorage } from '../../../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
    if (req.method !== 'DELETE') {
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // 1. Authenticate and Authorize Admin
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        const { albumId, photoId } = req.query;
        if (!albumId || !photoId) {
            return res.status(400).json({ message: 'Album ID and Photo ID are required.' });
        }

        const photoRef = adminDb.collection('photo_albums').doc(albumId).collection('photos').doc(photoId);
        const photoSnap = await photoRef.get();

        if (!photoSnap.exists) {
            return res.status(404).json({ message: 'Photo not found.' });
        }

        const photoData = photoSnap.data();

        // 2. Delete File from Firebase Storage
        if (photoData.storagePath) {
            try {
                await adminStorage.bucket().file(photoData.storagePath).delete();
            } catch (storageError) {
                console.error(`Failed to delete photo from storage: ${photoData.storagePath}`, storageError);
            }
        }

        // 3. Delete Metadata from Firestore
        await photoRef.delete();

        // 4. Optional: Check if the deleted photo was the cover photo and clear it
        const albumRef = adminDb.collection('photo_albums').doc(albumId);
        const albumSnap = await albumRef.get();
        if(albumSnap.exists && albumSnap.data().coverImageUrl === photoData.downloadURL) {
            await albumRef.update({ coverImageUrl: null });
        }


        return res.status(200).json({ message: 'Photo deleted successfully.' });

    } catch (error) {
        console.error('Delete Photo Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred during photo deletion.' });
    }
}
