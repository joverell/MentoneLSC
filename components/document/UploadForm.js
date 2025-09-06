import { useState } from 'react';
import formStyles from '../../styles/Form.module.css';
import docStyles from '../../styles/Documents.module.css';
import StyledFileInput from './StyledFileInput';
import GroupSelector from './GroupSelector';

const UploadForm = ({ accessGroups, onUploadSuccess }) => {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [file, setFile] = useState(null);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

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
        selectedGroups.forEach(groupId => {
            formData.append('accessGroupIds[]', groupId);
        });

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
            setSelectedGroups([]);
            onUploadSuccess();
        } catch (err) {
            setUploadError(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={`${formStyles.form} ${docStyles.uploadFormContainer}`}>
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
                    <StyledFileInput onFileSelect={setFile} />
                </div>
                <div className={formStyles.formGroup}>
                    <label htmlFor="accessGroups">Restrict to Groups</label>
                    <GroupSelector
                        groups={accessGroups}
                        selectedGroups={selectedGroups}
                        onSelectionChange={setSelectedGroups}
                    />
                </div>
                <button type="submit" className={formStyles.button} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload Document'}
                </button>
            </form>
        </div>
    );
};

export default UploadForm;
