import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/Admin.module.css';
import formStyles from '../../styles/Form.module.css';
import AdminLayout from '../../components/admin/AdminLayout';
import Link from 'next/link';

export default function SettingsAdminPage() {
    const { user } = useAuth();
    const [settings, setSettings] = useState({ instagram: { enabled: false } });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/settings');
            if (!res.ok) throw new Error('Failed to fetch settings');
            const data = await res.json();
            setSettings(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && user.roles.includes('Admin')) {
            fetchSettings();
        }
    }, [user]);

    const handleInstagramToggle = async (e) => {
        const newEnabledState = e.target.checked;
        setSaving(true);
        setError(null);

        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instagram: { enabled: newEnabledState }
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to update settings');

            // Update local state after successful save
            setSettings(prevSettings => ({
                ...prevSettings,
                instagram: { ...prevSettings.instagram, enabled: newEnabledState }
            }));

        } catch (err) {
            setError(err.message);
            // Optionally, revert the toggle on error
            // For simplicity, we'll just show the error message
        } finally {
            setSaving(false);
        }
    };

    if (!user || !user.roles.includes('Admin')) {
        return <p>Access Denied.</p>;
    }

    return (
        <AdminLayout>
            <h1 className={styles.pageTitle}>Application Settings</h1>
            {loading && <p>Loading settings...</p>}
            {error && <p className={styles.error}>{error}</p>}

            {!loading && (
                <div className={formStyles.form}>
                    <h3>Integrations</h3>
                    <div className={formStyles.formGroup}>
                        <label htmlFor="instagram-toggle">
                            Show Instagram Feed in Gallery
                        </label>
                        <label className={formStyles.switch}>
                            <input
                                id="instagram-toggle"
                                type="checkbox"
                                checked={settings.instagram?.enabled || false}
                                onChange={handleInstagramToggle}
                                disabled={saving}
                            />
                            <span className={`${formStyles.slider} ${formStyles.round}`}></span>
                        </label>
                        {saving && <small>Saving...</small>}
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
