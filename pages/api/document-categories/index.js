import { adminDb } from '@/src/firebase-admin';
import { withAuth } from '@/utils/api-auth';
import { FieldValue } from 'firebase-admin/firestore';

async function handler(req, res) {
    if (req.method === 'GET') {
        return getCategories(req, res);
    } else if (req.method === 'POST') {
        return createCategory(req, res);
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

async function getCategories(req, res) {
    try {
        const snapshot = await adminDb.collection('documentCategories').orderBy('name').get();
        const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return res.status(200).json(categories);
    } catch (error) {
        console.error('Get Document Categories Error:', error);
        return res.status(500).json({ message: 'An error occurred while fetching document categories.' });
    }
}

async function createCategory(req, res) {
    // Role check
    if (!req.user.roles || !req.user.roles.includes('Admin')) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
    }

    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Category name is required.' });
    }

    try {
        // Check for existing category with the same name (case-insensitive)
        const snapshot = await adminDb.collection('documentCategories')
            .where('name_lowercase', '==', name.toLowerCase())
            .limit(1)
            .get();

        if (!snapshot.empty) {
            return res.status(409).json({ message: 'A category with this name already exists.' });
        }

        const newCategory = {
            name: name,
            name_lowercase: name.toLowerCase(), // For case-insensitive checks
            createdAt: FieldValue.serverTimestamp(),
            createdBy: req.user.uid,
        };

        const docRef = await adminDb.collection('documentCategories').add(newCategory);

        return res.status(201).json({ id: docRef.id, ...newCategory });

    } catch (error) {
        console.error('Create Document Category Error:', error);
        return res.status(500).json({ message: 'An error occurred while creating the document category.' });
    }
}

export default withAuth(handler);
