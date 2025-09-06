import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Home.module.css';
import docStyles from '../styles/Documents.module.css';
import BottomNav from '../components/BottomNav';
import DocumentList from '../components/document/DocumentList';
import UploadForm from '../components/document/UploadForm';
import EmptyState from '../components/document/EmptyState';

export default function DocumentsPage() {
    const { user } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [accessGroups, setAccessGroups] = useState([]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/documents');
            if (!res.ok) throw new Error('Failed to fetch documents');
            const data = await res.json();
            setDocuments(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccessGroups = async () => {
        try {
            const res = await fetch('/api/access_groups');
            if (!res.ok) throw new Error('Failed to fetch access groups');
            const data = await res.json();
            setAccessGroups(data);
        } catch (err) {
            console.error(err); // Log error but don't block UI
        }
    };

    useEffect(() => {
        fetchDocuments();
        if (user && user.roles.includes('Admin')) {
            fetchAccessGroups();
        }
    }, [user]);

    const handleDelete = async (docId) => {
        if (!window.confirm('Are you sure you want to delete this document?')) return;
        try {
            const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to delete');
            }
            fetchDocuments(); // Refresh list
        } catch (err) {
            setError(err.message);
        }
    };

    const onUploadSuccess = () => {
        fetchDocuments();
    }

    const isAdmin = user && user.roles.includes('Admin');

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
