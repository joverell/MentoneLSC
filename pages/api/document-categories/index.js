import { adminDb } from '../../../src/firebase-admin';
import { withAuth } from '../../../utils/api-auth';
import { FieldValue } from 'firebase-admin/firestore';

// This is the main handler that will be exported.
// It will delegate to the appropriate function based on the request method.
// The withAuth middleware will be applied selectively.
const handler = async (req, res) => {
    switch (req.method) {
        case 'GET':
            return getCategories(req, res);
        case 'POST':
            // Apply withAuth middleware only for POST
            return withAuth(createCategory)(req, res);
        default:
            res.setHeader('Allow', ['GET', 'POST']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
};

// Publicly accessible function to get categories
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

// Admin-only function to create a category
async function createCategory(req, res) {
    // Role check is now handled by withAuth, but an extra layer of defense is good.
    if (!req.user || !req.user.roles || !req.user.roles.includes('Admin')) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
    }

    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ message: 'Category name is required and must be a non-empty string.' });
    }

    const trimmedName = name.trim();

    try {
        const snapshot = await adminDb.collection('documentCategories')
            .where('name_lowercase', '==', trimmedName.toLowerCase())
            .limit(1)
            .get();

        if (!snapshot.empty) {
            return res.status(409).json({ message: 'A category with this name already exists.' });
        }

        const newCategory = {
            name: trimmedName,
            name_lowercase: trimmedName.toLowerCase(),
            createdAt: FieldValue.serverTimestamp(),
            createdBy: req.user.uid,
        };

        const docRef = await adminDb.collection('documentCategories').add(newCategory);
        const categoryData = (await docRef.get()).data();


        return res.status(201).json({ id: docRef.id, ...categoryData });

    } catch (error) {
        console.error('Create Document Category Error:', error);
        return res.status(500).json({ message: 'An error occurred while creating the document category.' });
    }
}

export default handler;
