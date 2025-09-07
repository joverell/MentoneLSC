import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import logger from '../utils/logger';
import { fetchWithAuth } from '../utils/auth-fetch';
import styles from '../styles/Home.module.css';
import docStyles from '../styles/Documents.module.css';
import BottomNav from '../components/BottomNav';
import DocumentList from '../components/document/DocumentList';
import UploadForm from '../components/document/UploadForm';
import EmptyState from '../components/document/EmptyState';

export default function DocumentsPage() {
    const { user } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accessGroups, setAccessGroups] = useState([]);

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
            // Do not set main error state, as this is not a critical failure
        }
    };

    const fetchCategories = async () => {
        const context = { component: 'DocumentsPage', function: 'fetchCategories' };
        logger.info('Attempting to fetch document categories', context);
        try {
            const res = await fetchWithAuth('/api/document-categories');
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ message: 'No error body' }));
                throw new Error(errorData.message || `Failed to fetch categories with status: ${res.status}`);
            }
            const data = await res.json();
            setCategories(data);
            logger.info('Successfully fetched document categories', context, { count: data.length });
        } catch (err) {
            logger.error('Failed to fetch document categories', context, err);
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchDocuments();
        fetchCategories();
        if (user && user.roles && user.roles.includes('Admin')) {
            fetchAccessGroups();
        }
    }, [user]);

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

    useEffect(() => {
        const context = { component: 'DocumentsPage', function: 'useEffect[]' };
        logger.info('DocumentsPage component mounted', context);
    }, []);

    const isAdmin = user && user.roles && user.roles.includes('Admin');

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Club Documents</h1>
            </header>
            <main>
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
                    />
                )}

                {!loading && documents.length === 0 && (
                    <EmptyState
                        isAdmin={isAdmin}
                    />
                )}
            </main>
            <BottomNav />
        </div>
    );
}
