import { adminDb, adminStorage } from '../../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
    if (req.method !== 'DELETE') {
        res.setHeader('Allow', ['DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // Authenticate and Authorize Admin
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ message: 'Sponsor ID is required.' });
        }

        const docRef = adminDb.collection('sponsors').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ message: 'Sponsor not found.' });
        }

        const sponsor = docSnap.data();

        // Delete logo from Firebase Storage
        if (sponsor.storagePath) {
            try {
                await adminStorage.bucket().file(sponsor.storagePath).delete();
            } catch (storageError) {
                console.error(`Failed to delete sponsor logo from storage: ${sponsor.storagePath}`, storageError);
            }
        }

        // Delete metadata from Firestore
        await docRef.delete();

        return res.status(200).json({ message: 'Sponsor deleted successfully.' });

    } catch (error) {
        console.error('Delete Sponsor Error:', error);
        return res.status(500).json({ message: 'An error occurred during sponsor deletion.' });
    }
}
