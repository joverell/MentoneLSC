import { adminDb } from '@/src/firebase-admin';
import { withAuth } from '@/utils/api-auth';
import { FieldValue } from 'firebase-admin/firestore';

async function handler(req, res) {
    const { id } = req.query;

    if (req.method === 'PUT') {
        return updateCategory(req, res, id);
    } else if (req.method === 'DELETE') {
        return deleteCategory(req, res, id);
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}

async function updateCategory(req, res, id) {
    if (!req.user.roles || !req.user.roles.includes('Admin')) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
    }

    const { name } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'Category name is required.' });
    }

    try {
        const categoryRef = adminDb.collection('documentCategories').doc(id);
        const doc = await categoryRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Category not found.' });
        }

        const snapshot = await adminDb.collection('documentCategories')
            .where('name_lowercase', '==', name.toLowerCase())
            .limit(1)
            .get();

        if (!snapshot.empty && snapshot.docs[0].id !== id) {
            return res.status(409).json({ message: 'A category with this name already exists.' });
        }

        const updatedData = {
            name: name,
            name_lowercase: name.toLowerCase(),
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: req.user.uid,
        };

        await categoryRef.update(updatedData);

        return res.status(200).json({ id: id, ...updatedData });

    } catch (error) {
        console.error('Update Document Category Error:', error);
        return res.status(500).json({ message: 'An error occurred while updating the document category.' });
    }
}

async function deleteCategory(req, res, id) {
    if (!req.user.roles || !req.user.roles.includes('Admin')) {
        return res.status(403).json({ message: 'Forbidden: You do not have permission.' });
    }

    try {
        const categoryRef = adminDb.collection('documentCategories').doc(id);
        const doc = await categoryRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Category not found.' });
        }

        // Before deleting, check if any documents are using this category
        const documentsSnapshot = await adminDb.collection('documents')
            .where('categoryId', '==', id)
            .limit(1)
            .get();

        if (!documentsSnapshot.empty) {
            return res.status(400).json({ message: 'Cannot delete category: It is currently in use by one or more documents.' });
        }

        await categoryRef.delete();

        return res.status(204).end();

    } catch (error) {
        console.error('Delete Document Category Error:', error);
        return res.status(500).json({ message: 'An error occurred while deleting the document category.' });
    }
}

export default withAuth(handler);
