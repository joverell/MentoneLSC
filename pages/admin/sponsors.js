import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/Admin.module.css';
import formStyles from '../../styles/Form.module.css';
import AdminLayout from '../../components/admin/AdminLayout';
import EditSponsorModal from '../../components/admin/EditSponsorModal';
import Link from 'next/link';
import Button from '../../components/ui/Button';

export default function SponsorsAdminPage() {
    const { user } = useAuth();
    const [sponsors, setSponsors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for the upload form
    const [name, setName] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [logo, setLogo] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);

    // State for editing
    const [editingSponsor, setEditingSponsor] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const fetchSponsors = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/sponsors');
            if (!res.ok) throw new Error('Failed to fetch sponsors');
            const data = await res.json();
            setSponsors(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && user.roles.includes('Admin')) {
            fetchSponsors();
        }
    }, [user]);

    const handleAddSponsor = async (e) => {
        e.preventDefault();
        if (!logo || !name || !websiteUrl) {
            setUploadError('Please fill in all fields and select a logo.');
            return;
        }
        setUploading(true);
        setUploadError(null);

        const formData = new FormData();
        formData.append('name', name);
        formData.append('websiteUrl', websiteUrl);
        formData.append('logo', logo);

        try {
            const res = await fetch('/api/sponsors', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Upload failed');

            // Reset form and refresh list
            setName('');
            setWebsiteUrl('');
            setLogo(null);
            e.target.reset();
            fetchSponsors();
        } catch (err) {
            setUploadError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleEditClick = (sponsor) => {
        setEditingSponsor(sponsor);
        setIsEditModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsEditModalOpen(false);
        setEditingSponsor(null);
    };

    const handleSponsorUpdated = () => {
        handleCloseModal();
        fetchSponsors();
    };

    const handleDelete = async (sponsorId) => {
        if (!window.confirm('Are you sure you want to delete this sponsor?')) return;
        try {
            await fetch(`/api/sponsors/${sponsorId}`, { method: 'DELETE' });
            fetchSponsors(); // Refresh list
        } catch (err) {
            setError(err.message);
        }
    };

    if (!user || !user.roles.includes('Admin')) {
        return <p>Access Denied.</p>;
    }

    return (
        <AdminLayout>
            <h1 className={styles.pageTitle}>Manage Sponsors</h1>
            <div className={formStyles.form} style={{ marginBottom: '2rem' }}>
                <h3>Add New Sponsor</h3>
                <form onSubmit={handleAddSponsor}>
                    {uploadError && <p className={formStyles.error}>{uploadError}</p>}
                    <div className={formStyles.formGroup}>
                        <label htmlFor="name">Sponsor Name</label>
                        <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required />
                    </div>
                    <div className={formStyles.formGroup}>
                        <label htmlFor="websiteUrl">Website URL</label>
                        <input type="url" id="websiteUrl" value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://example.com" required />
                    </div>
                    <div className={formStyles.formGroup}>
                        <label htmlFor="logo">Logo Image</label>
                        <input type="file" id="logo" accept="image/*" onChange={e => setLogo(e.target.files[0])} required />
                    </div>
                    <Button type="submit" variant="primary" disabled={uploading}>
                        {uploading ? 'Uploading...' : 'Add Sponsor'}
                    </Button>
                </form>
            </div>

            {loading && <p>Loading sponsors...</p>}
            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.tableContainer}>
                <h3>Current Sponsors</h3>
                <table className={styles.userTable}>
                    <thead>
                        <tr>
                            <th>Logo</th>
                            <th>Name</th>
                            <th>Website</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sponsors.map(sponsor => (
                            <tr key={sponsor.id}>
                                <td><img src={sponsor.logoUrl} alt={sponsor.name} width="100" /></td>
                                <td>{sponsor.name}</td>
                                <td><a href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer">{sponsor.websiteUrl}</a></td>
                                <td>
                                    <Button onClick={() => handleEditClick(sponsor)} variant="primary">Edit</Button>
                                    <Button onClick={() => handleDelete(sponsor.id)} variant="danger">Delete</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {isEditModalOpen && (
                    <EditSponsorModal
                        sponsor={editingSponsor}
                        onClose={handleCloseModal}
                        onUpdate={handleSponsorUpdated}
                    />
                )}
            </div>
        </AdminLayout>
    );
}
