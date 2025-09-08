import { adminDb } from '../../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

async function getAlbum(req, res, albumId) {
    console.log(`[${new Date().toISOString()}] GET request for album ${albumId}`);
    try {
        const albumRef = adminDb.collection('photo_albums').doc(albumId);
        const albumDoc = await albumRef.get();

        if (!albumDoc.exists) {
            console.warn(`[${new Date().toISOString()}] Album not found: ${albumId}`);
            return res.status(404).json({ message: 'Album not found' });
        }

        const albumData = albumDoc.data();
        console.log(`[${new Date().toISOString()}] Fetched album data for ${albumId}`);

        // Fetch photos subcollection
        const photosSnapshot = await albumRef.collection('photos').orderBy('createdAt', 'asc').get();
        const photos = photosSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        console.log(`[${new Date().toISOString()}] Fetched ${photos.length} photos for album ${albumId}`);

        const responseData = {
            id: albumDoc.id,
            ...albumData,
            createdAt: albumData.createdAt.toDate().toISOString(),
            photos,
            likeCount: albumData.likeCount || 0,
            likes: albumData.likes || [],
        };

        return res.status(200).json(responseData);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error fetching album ${albumId}:`, error);
        return res.status(500).json({ message: 'An error occurred while fetching the album.' });
    }
}

async function deleteAlbum(req, res, albumId) {
    console.log(`[${new Date().toISOString()}] DELETE request for album ${albumId}`);

    // Authenticate and Authorize Admin
    console.log(`[${new Date().toISOString()}] Authenticating admin for album deletion...`);
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

        const albumRef = adminDb.collection('photo_albums').doc(albumId);

        // Optionally, delete all photos in the subcollection first
        console.log(`[${new Date().toISOString()}] Deleting photos from subcollection of album ${albumId}`);
        const photosSnapshot = await albumRef.collection('photos').get();
        if (!photosSnapshot.empty) {
            const batch = adminDb.batch();
            photosSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`[${new Date().toISOString()}] Deleted ${photosSnapshot.size} photos from album ${albumId}`);
        } else {
            console.log(`[${new Date().toISOString()}] No photos to delete in album ${albumId}`);
        }

        // Delete the album document
        console.log(`[${new Date().toISOString()}] Deleting album document ${albumId}`);
        await albumRef.delete();
        console.log(`[${new Date().toISOString()}] Successfully deleted album ${albumId}`);

        return res.status(200).json({ message: 'Album deleted successfully' });
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error deleting album ${albumId}:`, error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred while deleting the album.' });
    }
}

export default async function handler(req, res) {
    const { albumId } = req.query;

    if (req.method === 'GET') {
        return getAlbum(req, res, albumId);
    } else if (req.method === 'DELETE') {
        return deleteAlbum(req, res, albumId);
    } else {
        res.setHeader('Allow', ['GET', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
