import { useState } from 'react';
import formStyles from '../../styles/Form.module.css';
import styles from '../../styles/Admin.module.css';
import Button from '../ui/Button';

export default function EditSponsorModal({ sponsor, onClose, onUpdate }) {
    const [name, setName] = useState(sponsor.name);
    const [websiteUrl, setWebsiteUrl] = useState(sponsor.websiteUrl);
    const [logo, setLogo] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append('name', name);
        formData.append('websiteUrl', websiteUrl);
        if (logo) {
            formData.append('logo', logo);
        }

        try {
            const res = await fetch(`/api/sponsors/${sponsor.id}`, {
                method: 'PUT',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Update failed');
            onUpdate();
        } catch (err) {
            setUploadError(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={styles.modalBackdrop}>
            <div className={styles.modalContent}>
                <Button onClick={onClose} variant="secondary" className={styles.closeButton}>&times;</Button>
                <h2>Edit Sponsor</h2>
                <form onSubmit={handleSubmit} className={formStyles.form}>
                    {uploadError && <p className={formStyles.error}>{uploadError}</p>}
                    <div className={formStyles.formGroup}>
                        <label htmlFor="edit-name">Sponsor Name</label>
                        <input type="text" id="edit-name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className={formStyles.formGroup}>
                        <label htmlFor="edit-websiteUrl">Website URL</label>
                        <input type="url" id="edit-websiteUrl" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://example.com" required />
                    </div>
                    <div className={formStyles.formGroup}>
                        <label htmlFor="edit-logo">New Logo (optional)</label>
                        <input type="file" id="edit-logo" accept="image/*" onChange={e => setLogo(e.target.files[0])} />
                    </div>
                    <div className={formStyles.buttonGroup}>
                        <Button type="submit" variant="primary" disabled={uploading}>
                            {uploading ? 'Updating...' : 'Update Sponsor'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
