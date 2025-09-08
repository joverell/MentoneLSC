import { adminDb, adminStorage } from '../../../../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
    console.log(`[${new Date().toISOString()}] Received request to delete photo:`, req.query);

    if (req.method !== 'DELETE') {
        console.warn(`[${new Date().toISOString()}] Method ${req.method} not allowed for photo deletion.`);
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // 1. Authenticate and Authorize Admin
    console.log(`[${new Date().toISOString()}] Authenticating admin for photo deletion...`);
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) {
        console.error(`[${new Date().toISOString()}] Authentication failed: No token provided.`);
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            console.error(`[${new Date().toISOString()}] Authorization failed: User does not have Admin role.`);
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }
        console.log(`[${new Date().toISOString()}] Admin authenticated successfully.`);

        const { albumId, photoId } = req.query;
        if (!albumId || !photoId) {
            console.error(`[${new Date().toISOString()}] Bad request: Missing albumId or photoId.`);
            return res.status(400).json({ message: 'Album ID and Photo ID are required.' });
        }
        console.log(`[${new Date().toISOString()}] Deleting photo ${photoId} from album ${albumId}.`);

        const photoRef = adminDb.collection('photo_albums').doc(albumId).collection('photos').doc(photoId);
        const photoSnap = await photoRef.get();

        if (!photoSnap.exists) {
            console.error(`[${new Date().toISOString()}] Photo not found in Firestore: ${photoId}`);
            return res.status(404).json({ message: 'Photo not found.' });
        }

        const photoData = photoSnap.data();
        console.log(`[${new Date().toISOString()}] Photo data retrieved from Firestore:`, photoData);

        // 2. Delete File from Firebase Storage
        if (photoData.storagePath) {
            try {
                console.log(`[${new Date().toISOString()}] Deleting photo from Firebase Storage: ${photoData.storagePath}`);
                await adminStorage.bucket().file(photoData.storagePath).delete();
                console.log(`[${new Date().toISOString()}] Successfully deleted photo from Storage.`);
            } catch (storageError) {
                console.error(`[${new Date().toISOString()}] Failed to delete photo from storage: ${photoData.storagePath}`, storageError);
                // Non-fatal, continue to delete Firestore record
            }
        } else {
            console.warn(`[${new Date().toISOString()}] No storagePath found for photo ${photoId}. Skipping storage deletion.`);
        }

        // 3. Delete Metadata from Firestore
        console.log(`[${new Date().toISOString()}] Deleting photo metadata from Firestore: ${photoId}`);
        await photoRef.delete();
        console.log(`[${new Date().toISOString()}] Successfully deleted photo metadata from Firestore.`);

        // 4. Optional: Check if the deleted photo was the cover photo and clear it
        const albumRef = adminDb.collection('photo_albums').doc(albumId);
        const albumSnap = await albumRef.get();
        if(albumSnap.exists && albumSnap.data().coverImageUrl === photoData.downloadURL) {
            console.log(`[${new Date().toISOString()}] Deleted photo was the cover photo. Clearing coverImageUrl for album ${albumId}.`);
            await albumRef.update({ coverImageUrl: null });
            console.log(`[${new Date().toISOString()}] Successfully cleared coverImageUrl.`);
        }

        console.log(`[${new Date().toISOString()}] Photo deletion process completed successfully for photo ${photoId}.`);
        return res.status(200).json({ message: 'Photo deleted successfully.' });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] An unexpected error occurred during photo deletion:`, error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred during photo deletion.' });
    }
}
