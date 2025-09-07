import { useState, useEffect } from 'react';
import axios from 'axios';
import GroupSelector from './GroupSelector';
import styles from '../../styles/Form.module.css';
import StyledFileInput from './StyledFileInput';

const UploadForm = ({ onUploadSuccess }) => {
    const [name, setName] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [categories, setCategories] = useState([]);
    const [file, setFile] = useState(null);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get('/api/document-categories');
                setCategories(res.data);
            } catch (err) {
                console.error('Failed to fetch categories for upload form', err);
                setError('Could not load document categories.');
            }
        };
        fetchCategories();
    }, []);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        if (!name || !categoryId || !file) {
            setError('Please fill in all fields and select a file.');
            setIsSubmitting(false);
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('categoryId', categoryId);
        formData.append('file', file);
        selectedGroups.forEach(groupId => {
            formData.append('group_id', groupId);
        });


        try {
            const response = await axios.post('/api/documents', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onUploadSuccess(response.data);
            // Reset form
            setName('');
            setCategoryId('');
            setFile(null);
            setSelectedGroups([]);
            // Clear the file input visually
            document.getElementById('file-input').value = '';

        } catch (err) {
            setError(err.response?.data?.error || 'An error occurred during upload.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            {error && <p className={styles.error}>{error}</p>}
            <div className={styles.formGroup}>
                <label htmlFor="name">Document Name</label>
                <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={styles.input}
                />
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="category">Category</label>
                <select
                    id="category"
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className={styles.input}
                >
                    <option value="">Select a category</option>
                    {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="file-input">File</label>
                <StyledFileInput
                    id="file-input"
                    onChange={handleFileChange}
                    fileName={file ? file.name : "No file selected"}
                />
            </div>
            <div className={styles.formGroup}>
                <label>Visible to Groups</label>
                <GroupSelector
                    selectedGroups={selectedGroups}
                    setSelectedGroups={setSelectedGroups}
                />
                <p className={styles.infoText}>If no group is selected, the document will be visible to everyone.</p>
            </div>
            <button type="submit" disabled={isSubmitting} className={styles.button}>
                {isSubmitting ? 'Uploading...' : 'Upload'}
            </button>
        </form>
    );
};

export default UploadForm;
