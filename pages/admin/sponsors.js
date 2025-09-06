import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/Admin.module.css';
import formStyles from '../../styles/Form.module.css';
import BottomNav from '../../components/BottomNav';
import Link from 'next/link';

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
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Manage Sponsors</h1>
            </header>
            <div className={styles.container}>
                <div className={styles.adminNav}>
                    <Link href="/admin/users" className={styles.adminNavLink}>Manage Users</Link>
                    <span style={{ margin: '0 1rem' }}>|</span>
                    <Link href="/admin/groups" className={styles.adminNavLink}>Manage Groups</Link>
                    <span style={{ margin: '0 1rem' }}>|</span>
                    <Link href="/admin/settings" className={styles.adminNavLink}>Settings</Link>
                </div>

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
                        <button type="submit" className={formStyles.button} disabled={uploading}>
                            {uploading ? 'Uploading...' : 'Add Sponsor'}
                        </button>
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
                                        <button onClick={() => handleDelete(sponsor.id)} className={formStyles.deleteButton}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
            <BottomNav />
        </div>
    );
}
