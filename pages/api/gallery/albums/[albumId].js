import { adminDb } from '../../../../src/firebase-admin';

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

async function getAlbum(req, res, albumId) {
    try {
        const albumRef = adminDb.collection('photo_albums').doc(albumId);
        const albumDoc = await albumRef.get();

        if (!albumDoc.exists) {
            return res.status(404).json({ message: 'Album not found' });
        }

        const albumData = albumDoc.data();

        // Fetch photos subcollection
        const photosSnapshot = await albumRef.collection('photos').orderBy('createdAt', 'asc').get();
        const photos = photosSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

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
        console.error(`Get Album ${albumId} Error:`, error);
        return res.status(500).json({ message: 'An error occurred while fetching the album.' });
    }
}

async function deleteAlbum(req, res, albumId) {
    // Note: Add authentication/authorization checks here in a real app
    try {
        const albumRef = adminDb.collection('photo_albums').doc(albumId);

        // Optionally, delete all photos in the subcollection first
        const photosSnapshot = await albumRef.collection('photos').get();
        if (!photosSnapshot.empty) {
            const batch = adminDb.batch();
            photosSnapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

        // Delete the album document
        await albumRef.delete();

        return res.status(200).json({ message: 'Album deleted successfully' });
    } catch (error) {
        console.error(`Delete Album ${albumId} Error:`, error);
        return res.status(500).json({ message: 'An error occurred while deleting the album.' });
    }
}
