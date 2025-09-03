import { adminDb } from '../../src/firebase-admin';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

const JWT_SECRET = process.env.JWT_SECRET;
const SETTINGS_DOC_ID = 'app-settings';

export default async function handler(req, res) {
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.auth_token;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }

    const settingsRef = adminDb.collection('settings').doc(SETTINGS_DOC_ID);

    if (req.method === 'GET') {
        try {
            const doc = await settingsRef.get();
            if (!doc.exists) {
                // Default settings if the document doesn't exist
                return res.status(200).json({ instagram: { enabled: false } });
            }
            return res.status(200).json(doc.data());
        } catch (error) {
            console.error('Failed to fetch settings:', error);
            return res.status(500).json({ message: 'An error occurred while fetching settings.' });
        }
    } else if (req.method === 'POST') {
        // --- Authorization Check ---
        const isSuperAdmin = decoded.roles && decoded.roles.includes('Admin');
        if (!isSuperAdmin) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission to update settings.' });
        }
        // --- End Authorization Check ---

        try {
            const { instagram } = req.body;
            // Using set with merge: true to create or update the document
            await settingsRef.set({ instagram }, { merge: true });
            return res.status(200).json({ message: 'Settings updated successfully.' });
        } catch (error) {
            console.error('Failed to update settings:', error);
            return res.status(500).json({ message: 'An error occurred while updating settings.' });
        }
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
