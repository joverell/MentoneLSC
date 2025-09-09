import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import logger from '../utils/logger';
import { fetchWithAuth } from '../utils/auth-fetch';
import styles from '../styles/Home.module.css';
import DocumentList from '../components/document/DocumentList';
import UploadForm from '../components/document/UploadForm';
import EmptyState from '../components/document/EmptyState';
import EditDocumentModal from '../components/document/EditDocumentModal';

import withAuth from '../components/hoc/withAuth';

function DocumentsPage() {
    const { user } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accessGroups, setAccessGroups] = useState([]);
    const [editingDoc, setEditingDoc] = useState(null);

    const fetchDocuments = async () => {
        const context = { component: 'DocumentsPage', function: 'fetchDocuments' };
        logger.info('Attempting to fetch documents', context);
        try {
            setLoading(true);
            const res = await fetchWithAuth('/api/documents');
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: 'No error body' }));
                throw new Error(errorData.message || `Failed to fetch documents with status: ${res.status}`);
            }
            const data = await res.json();
            setDocuments(data);
            logger.info('Successfully fetched documents', context, { count: data.length });
        } catch (err) {
            logger.error('Failed to fetch documents', context, err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccessGroups = async () => {
        const context = { component: 'DocumentsPage', function: 'fetchAccessGroups' };
        logger.info('Attempting to fetch access groups', context);
        try {
            const res = await fetchWithAuth('/api/access_groups');
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: 'No error body' }));
                throw new Error(errorData.message || `Failed to fetch access groups with status: ${res.status}`);
            }
            const data = await res.json();
            setAccessGroups(data);
            logger.info('Successfully fetched access groups', context, { count: data.length });
        } catch (err) {
            logger.error('Failed to fetch access groups', context, err);
        }
    };

    const fetchCategories = async () => {
        const context = { component: 'DocumentsPage', function: 'fetchCategories' };
        logger.info('Attempting to fetch document categories', context);
        try {
            const res = await axios.get('/api/document-categories');
            setCategories(res.data);
            logger.info('Successfully fetched document categories', { ...context, count: res.data.length });
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || 'An unknown error occurred';
            logger.error('Failed to fetch document categories', { ...context, error: errorMessage });
            if (!error) {
                setError('Could not load document categories.');
            }
        }
    };

    useEffect(() => {
        fetchDocuments();
        fetchCategories();
        if (user && user.roles && user.roles.includes('Admin')) {
            fetchAccessGroups();
        }
    }, [user]);

    const handleEdit = (doc) => {
        setEditingDoc(doc);
    };

    const handleCloseModal = () => {
        setEditingDoc(null);
    };

    const handleSave = async (docId, accessGroupIds) => {
        const context = { component: 'DocumentsPage', function: 'handleSave', docId };
        logger.info('Attempting to save document', context);
        try {
            const res = await fetchWithAuth(`/api/documents/${docId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessGroupIds }),
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: 'No error body' }));
                throw new Error(errorData.message || `Failed to save document with status: ${res.status}`);
            }
            logger.info('Successfully saved document', context);
            fetchDocuments(); // Refresh list
        } catch (err) {
            logger.error('Failed to save document', context, err);
            setError(err.message);
            throw err; // Re-throw to be caught in the modal
        }
    };

    const handleDelete = async (docId) => {
        const context = { component: 'DocumentsPage', function: 'handleDelete', docId };
        logger.info('Delete button clicked', context);

        if (!window.confirm('Are you sure you want to delete this document?')) {
            logger.info('Document deletion cancelled by user', context);
            return;
        }

        logger.info('Attempting to delete document', context);
        try {
            const res = await fetchWithAuth(`/api/documents/${docId}`, { method: 'DELETE' });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: 'No error body' }));
                throw new Error(errorData.message || `Failed to delete document with status: ${res.status}`);
            }
            logger.info('Successfully deleted document', context);
            fetchDocuments(); // Refresh list
        } catch (err) {
            logger.error('Failed to delete document', context, err);
            setError(err.message);
        }
    };

    const onUploadSuccess = () => {
        const context = { component: 'DocumentsPage', function: 'onUploadSuccess' };
        logger.info('Document upload successful, refreshing document list', context);
        fetchDocuments();
    }

    const isAdmin = user && user.roles && user.roles.includes('Admin');

    return (
        <>
            {isAdmin && (
                <UploadForm
                    accessGroups={accessGroups}
                    onUploadSuccess={onUploadSuccess}
                />
            )}
            {loading && <p>Loading documents...</p>}
            {error && <p className={styles.error}>{error}</p>}

            {!loading && documents.length > 0 && (
                <DocumentList
                    documents={documents}
                    categories={categories}
                    isAdmin={isAdmin}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                />
            )}

            {!loading && documents.length === 0 && (
                <EmptyState
                    isAdmin={isAdmin}
                />
            )}

            {editingDoc && (
                <EditDocumentModal
                    doc={editingDoc}
                    accessGroups={accessGroups}
                    onSave={handleSave}
                    onClose={handleCloseModal}
                />
            )}
        </>
    );
}

export default withAuth(DocumentsPage);

export async function getStaticProps() {
    return {
        props: {
            title: 'Club Documents',
        },
    };
}
