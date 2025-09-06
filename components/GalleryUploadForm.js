import { useState } from 'react';
import FileUploadInput from './FileUploadInput';
import styles from '../styles/Form.module.css';

const GalleryUploadForm = ({ albumId, onUploadSuccess }) => {
    const [caption, setCaption] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleUpload = async (downloadURL) => {
        setUploading(true);
        setError(null);
        try {
            const res = await fetch(`/api/gallery/albums/${albumId}/photos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ downloadURL, caption }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to add photo to album');
            setCaption('');
            onUploadSuccess();
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={styles.form}>
            <h3>Upload New Photo</h3>
            <div className={styles.formGroup}>
                <label>Photo</label>
                <FileUploadInput onUploadSuccess={handleUpload} folder={`gallery/${albumId}`} />
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="caption">Caption (optional)</label>
                <input
                    type="text"
                    id="caption"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className={styles.input}
                />
            </div>
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
};

export default GalleryUploadForm;
