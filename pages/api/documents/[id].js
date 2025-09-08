import { adminDb, adminStorage } from '../../../src/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
    const { id } = req.query;

    if (req.method === 'PUT') {
        return updateDocument(req, res, id);
    } else if (req.method === 'DELETE') {
        return deleteDocument(req, res, id);
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

async function updateDocument(req, res, id) {
    const cookies = parseCookie(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        const { accessGroupIds } = req.body;

        if (!Array.isArray(accessGroupIds)) {
            return res.status(400).json({ message: 'accessGroupIds must be an array.' });
        }

        const docRef = adminDb.collection('documents').doc(id);
        await docRef.update({
            accessGroupIds,
            updatedAt: FieldValue.serverTimestamp(),
        });

        return res.status(200).json({ message: 'Document updated successfully.' });
    } catch (error) {
        console.error('Update Document Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred during document update.' });
    }
}

async function deleteDocument(req, res, id) {
    const cookies = parseCookie(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        const docRef = adminDb.collection('documents').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Document not found.' });
        }

        const document = doc.data();

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
