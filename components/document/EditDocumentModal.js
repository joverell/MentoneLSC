import { useState, useEffect } from 'react';
import GroupSelector from './GroupSelector';
import styles from '../../styles/Form.module.css';
import modalStyles from '../../styles/Modal.module.css';

const EditDocumentModal = ({ doc, accessGroups, onSave, onClose }) => {
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (doc) {
            setSelectedGroups(doc.accessGroupIds || []);
        }
    }, [doc]);

    const handleSave = async () => {
        setIsSubmitting(true);
        setError('');
        try {
            await onSave(doc.id, selectedGroups);
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save changes.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!doc) return null;

    return (
        <div className={modalStyles.overlay}>
            <div className={modalStyles.modal}>
                <h2 className={modalStyles.title}>Edit Document Visibility</h2>
                <p>Editing visibility for: <strong>{doc.title}</strong></p>
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.formGroup}>
                    <label>Visible to Groups</label>
                    <GroupSelector
                        groups={accessGroups || []}
                        selectedGroups={selectedGroups}
                        onSelectionChange={setSelectedGroups}
                    />
                    <p className={styles.infoText}>If no group is selected, the document will be visible to everyone.</p>
                </div>
                <div className={modalStyles.actions}>
                    <button onClick={onClose} className={`${styles.button} ${styles.buttonSecondary}`} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button onClick={handleSave} className={styles.button} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditDocumentModal;
