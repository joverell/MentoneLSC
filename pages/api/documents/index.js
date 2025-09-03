import { adminDb, adminStorage } from '../../../src/firebase-admin';
import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { formidable } from 'formidable';
import fs from 'fs';

const JWT_SECRET = process.env.JWT_SECRET;

// Disable the default body parser for this route to handle multipart/form-data
export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method === 'GET') {
        return getDocuments(req, res);
    } else if (req.method === 'POST') {
        return uploadDocument(req, res);
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

async function getDocuments(req, res) {
    try {
        const docsSnapshot = await adminDb.collection('documents').orderBy('createdAt', 'desc').get();
        const documents = docsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate().toISOString(),
        }));
        return res.status(200).json(documents);
    } catch (error) {
        console.error('Get Documents Error:', error);
        return res.status(500).json({ message: 'An error occurred while fetching documents.' });
    }
}

async function uploadDocument(req, res) {
    // 1. Authenticate and Authorize Admin
    const cookies = parseCookie(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        // 2. Parse Form Data
        const form = formidable({});
        const [fields, files] = await form.parse(req);

        const title = fields.title?.[0];
        const category = fields.category?.[0];
        const file = files.file?.[0];

        if (!title || !category || !file) {
            return res.status(400).json({ message: 'Title, category, and file are required.' });
        }

        // 3. Upload File to Firebase Storage
        const bucket = adminStorage.bucket();
        const filePath = file.filepath;
        const fileName = `${Date.now()}-${file.originalFilename}`;
        const destination = `documents/${fileName}`;

        await bucket.upload(filePath, {
            destination: destination,
            metadata: {
                contentType: file.mimetype,
            },
        });

        // Make the file public and get the URL
        const fileRef = bucket.file(destination);
        await fileRef.makePublic();
        const downloadURL = fileRef.publicUrl();

        // 4. Save Metadata to Firestore
        await adminDb.collection('documents').add({
            title,
            category,
            fileName,
            storagePath: destination,
            downloadURL,
            mimetype: file.mimetype,
            size: file.size,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            createdBy: decoded.uid,
        });

        return res.status(201).json({ message: 'Document uploaded successfully.' });

    } catch (error) {
        console.error('Upload Document Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred during document upload.' });
    }
}
