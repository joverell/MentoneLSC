import { adminDb, adminStorage } from '../../../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
    const { albumId } = req.query;

    if (!albumId) {
        return res.status(400).json({ message: 'Album ID is required.' });
    }

    if (req.method === 'GET') {
        return getAlbumDetails(req, res, albumId);
    } else if (req.method === 'DELETE') {
        return deleteAlbum(req, res, albumId);
    } else {
        res.setHeader('Allow', ['GET', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

async function getAlbumDetails(req, res, albumId) {
    try {
        const albumRef = adminDb.collection('photo_albums').doc(albumId);
        const albumSnap = await albumRef.get();

        if (!albumSnap.exists) {
            return res.status(404).json({ message: 'Album not found.' });
        }

        const photosSnap = await albumRef.collection('photos').orderBy('uploadedAt', 'desc').get();
        const photos = photosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Make sure to update the coverImageUrl if it's not set
        let coverImageUrl = albumSnap.data().coverImageUrl;
        if (!coverImageUrl && photos.length > 0) {
            coverImageUrl = photos[0].downloadURL;
            // Optionally, update the album document in Firestore
            // await albumRef.update({ coverImageUrl });
        }

        res.status(200).json({
            id: albumSnap.id,
            ...albumSnap.data(),
            coverImageUrl, // Use the updated cover image URL
            photos: photos,
        });
    } catch (error) {
        console.error('Get Album Details Error:', error);
        res.status(500).json({ message: 'Failed to fetch album details.' });
    }
}

async function deleteAlbum(req, res, albumId) {
    // Authenticate and Authorize Admin
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        const albumRef = adminDb.collection('photo_albums').doc(albumId);
        const photosSnap = await albumRef.collection('photos').get();

        const bucket = adminStorage.bucket();
        const deletePromises = [];

        // Delete all photos from storage
        photosSnap.forEach(doc => {
            const photoData = doc.data();
            if (photoData.storagePath) {
                deletePromises.push(bucket.file(photoData.storagePath).delete());
            }
        });

        await Promise.all(deletePromises);

        // Delete all photo documents in a batch
        const batch = adminDb.batch();
        photosSnap.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        // Delete the album document itself
        await albumRef.delete();

        res.status(200).json({ message: 'Album and all its photos deleted successfully.' });

    } catch (error) {
        console.error('Delete Album Error:', error);
        res.status(500).json({ message: 'Failed to delete album.' });
    }
}
