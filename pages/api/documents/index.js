import { adminDb, adminStorage } from '@/src/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { parseForm } from '@/utils/fileUploadParser';
import fs from 'fs';

const JWT_SECRET = process.env.JWT_SECRET;

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
    const cookies = parseCookie(req.headers.cookie || '');
    const token = cookies.auth_token;

    // Default to a non-authenticated, non-admin user
    let user = { userId: null, roles: [] };

    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            user = { userId: decoded.uid, roles: decoded.roles || [] };
        } catch (error) {
            // Invalid token, treat as a guest
            console.error('JWT verification error in getDocuments:', error.message);
        }
    }

    try {
        const docsRef = adminDb.collection('documents');
        let query = docsRef.orderBy('createdAt', 'desc');

        const docsSnapshot = await query.get();

        let documents = docsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt.toDate().toISOString(),
        }));

        // If user is not an admin, filter documents based on access groups
        if (!user.roles.includes('Admin')) {
            let userGroupIds = [];
            if (user.userId) {
                const memberSnapshot = await adminDb.collectionGroup('members')
                    .where('userId', '==', user.userId).get();
                userGroupIds = memberSnapshot.docs.map(doc => doc.ref.parent.parent.id);
            }

            documents = documents.filter(doc => {
                // Document is public if it has no access groups
                if (!doc.accessGroupIds || doc.accessGroupIds.length === 0) {
                    return true;
                }
                // Document is accessible if the user is in at least one of the required groups
                return doc.accessGroupIds.some(groupId => userGroupIds.includes(groupId));
            });
        }

        return res.status(200).json(documents);
    } catch (error) {
        console.error('Get Documents Error:', error);
        return res.status(500).json({ message: 'An error occurred while fetching documents.' });
    }
}

async function uploadDocument(req, res) {
    const cookies = parseCookie(req.headers.cookie || '');
    const token = cookies.auth_token;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    let filePath;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.roles || !decoded.roles.includes('Admin')) {
            return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
        }

        const { fields, files } = await parseForm(req);

        const title = fields.title?.[0];
        let categoryId = fields.categoryId?.[0];
        let accessGroupIds = fields['accessGroupIds[]'] || [];
        const file = files.file?.[0];

        if (accessGroupIds && !Array.isArray(accessGroupIds)) {
            accessGroupIds = [accessGroupIds];
        }

        if (!title || !file) {
            return res.status(400).json({ message: 'Title and file are required.' });
        }

        const finalCategoryId = categoryId || await getUncategorisedCategoryId();


        filePath = file.filepath;
        const bucket = adminStorage.bucket();
        const fileName = `${Date.now()}-${file.originalFilename}`;
        const destination = `documents/${fileName}`;

        await bucket.upload(filePath, {
            destination: destination,
            metadata: {
                contentType: file.mimetype,
            },
        });

        const fileRef = bucket.file(destination);
        await fileRef.makePublic();
        const downloadURL = fileRef.publicUrl();

        await adminDb.collection('documents').add({
            title,
            categoryId: finalCategoryId,
            accessGroupIds,
            fileName,
            storagePath: destination,
            downloadURL,
            mimetype: file.mimetype,
            size: file.size,
            createdAt: FieldValue.serverTimestamp(),
            createdBy: decoded.userId,
        });

        return res.status(201).json({ message: 'Document uploaded successfully.' });

    } catch (error) {
        console.error('Upload Document Error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        return res.status(500).json({ message: 'An error occurred during document upload.' });
    } finally {
        if (filePath) {
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkError) {
                console.error('Error deleting temporary file:', unlinkError);
            }
        }
    }
}

async function getUncategorisedCategoryId() {
    const categoriesRef = adminDb.collection('documentCategories');
    const snapshot = await categoriesRef.where('name_lowercase', '==', 'uncategorised').limit(1).get();

    if (!snapshot.empty) {
        return snapshot.docs[0].id;
    } else {
        const newCategory = {
            name: 'Uncategorised',
            name_lowercase: 'uncategorised',
            createdAt: FieldValue.serverTimestamp(),
            // Note: createdBy will be null as this is a system action.
            // Consider adding a system user ID if you have one.
            createdBy: null,
        };
        const docRef = await categoriesRef.add(newCategory);
        return docRef.id;
    }
}
