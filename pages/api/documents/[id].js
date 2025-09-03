import { adminDb, adminStorage } from '../../../src/firebase-admin';
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

        const { id } = req.query;
        if (!id) {
            return res.status(400).json({ message: 'Document ID is required.' });
        }

        const docRef = adminDb.collection('documents').doc(id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ message: 'Document not found.' });
        }

        const document = docSnap.data();

        // 2. Delete File from Firebase Storage
        if (document.storagePath) {
            try {
                await adminStorage.bucket().file(document.storagePath).delete();
            } catch (storageError) {
                // Log the error but don't fail the whole request,
                // as the Firestore entry is the source of truth for the app.
                console.error(`Failed to delete file from storage: ${document.storagePath}`, storageError);
            }
        }

        // 3. Delete Metadata from Firestore
        await docRef.delete();

        return res.status(200).json({ message: 'Document deleted successfully.' });

    } catch (error) {
        console.error('Delete Document Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred during document deletion.' });
    }
}
