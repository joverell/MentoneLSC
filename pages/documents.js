import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Home.module.css';
import formStyles from '../styles/Form.module.css';
import BottomNav from '../components/BottomNav';

export default function DocumentsPage() {
    const { user } = useAuth();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for the upload form
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

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

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !title || !category) {
            setUploadError('Please fill in all fields and select a file.');
            return;
        }
        setUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append('title', title);
        formData.append('category', category);
        formData.append('file', file);

        try {
            const res = await fetch('/api/documents', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Upload failed');
            }
            // Reset form and refresh list
            setTitle('');
            setCategory('');
            setFile(null);
            e.target.reset(); // Reset file input
            fetchDocuments();
        } catch (err) {
            setUploadError(err.message);
        } finally {
            setUploading(false);
        }
    };

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
            setError(err.message); // Show delete error in the main error display
        }
    };

    // Group documents by category
    const groupedDocuments = documents.reduce((acc, doc) => {
        (acc[doc.category] = acc[doc.category] || []).push(doc);
        return acc;
    }, {});

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Club Documents</h1>
            </header>
            <div className={styles.container}>
                {user && user.roles.includes('Admin') && (
                    <div className={formStyles.form} style={{ marginBottom: '2rem' }}>
                        <h3>Upload New Document</h3>
                        <form onSubmit={handleUpload}>
                            {uploadError && <p className={formStyles.error}>{uploadError}</p>}
                            <div className={formStyles.formGroup}>
                                <label htmlFor="title">Document Title</label>
                                <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required />
                            </div>
                            <div className={formStyles.formGroup}>
                                <label htmlFor="category">Category</label>
                                <input type="text" id="category" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g., Policies, Forms" required />
                            </div>
                            <div className={formStyles.formGroup}>
                                <label htmlFor="file">File</label>
                                <input type="file" id="file" onChange={e => setFile(e.target.files[0])} required />
                            </div>
                            <button type="submit" className={formStyles.button} disabled={uploading}>
                                {uploading ? 'Uploading...' : 'Upload Document'}
                            </button>
                        </form>
                    </div>
                )}

                {loading && <p>Loading documents...</p>}
                {error && <p className={styles.error}>{error}</p>}

                {Object.entries(groupedDocuments).map(([category, docs]) => (
                    <div key={category} className={styles.section}>
                        <h2>{category}</h2>
                        <ul className={styles.documentList}>
                            {docs.map(doc => (
                                <li key={doc.id}>
                                    <a href={doc.downloadURL} target="_blank" rel="noopener noreferrer">
                                        {doc.title}
                                    </a>
                                    {user && user.roles.includes('Admin') && (
                                        <button onClick={() => handleDelete(doc.id)} className={formStyles.deleteButton}>
                                            Delete
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
                {!loading && Object.keys(groupedDocuments).length === 0 && (
                    <p>No documents found.</p>
                )}
            </div>
            <BottomNav />
        </div>
    );
}
