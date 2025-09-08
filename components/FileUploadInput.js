import { useState } from 'react';
import styles from '@/styles/Form.module.css';

const FileUploadInput = ({ onUploadSuccess, folder }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Upload failed');

            onUploadSuccess(data.downloadURL);
            setFile(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div>
            <input type="file" onChange={handleFileChange} className={styles.input} />
            <button type="button" onClick={handleUpload} disabled={uploading || !file} className={styles.button}>
                {uploading ? 'Uploading...' : 'Upload'}
            </button>
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
};

export default FileUploadInput;
