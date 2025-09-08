import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import styles from '../../../styles/Form.module.css';
import AdminLayout from '../../../components/admin/AdminLayout';
import GroupSelector from '../../../components/document/GroupSelector';
import Button from '../../../components/ui/Button';

export default function CreateAlbum() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibleToGroups, setVisibleToGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/access_groups');
        if (!res.ok) throw new Error('Failed to fetch access groups');
        const data = await res.json();
        setAllGroups(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroups();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title) {
      setError('Please fill in all required fields.');
      return;
    }

    const payload = {
      title,
      description,
      visibleToGroups,
    };

    try {
      const res = await fetch('/api/gallery/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create album');
      }

      setSuccess('Album created successfully! Redirecting...');
      setTimeout(() => {
        router.push('/gallery');
      }, 2000);

    } catch (err) {
      setError(err.message);
    }
  };

  if (loading || loadingGroups) {
    return <p>Loading...</p>;
  }

  if (!user) {
    router.push('/account');
    return null;
  }

  const canCreate = user.roles.includes('Admin') || user.roles.includes('Group Admin');

  if(!canCreate) {
    return <p>You do not have permission to create albums.</p>
  }


  return (
    <AdminLayout>
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Create New Photo Album</h1>
            </header>
            <div className={`${styles.container} ${styles.formContainerFullWidth}`}>
                <form onSubmit={handleSubmit} className={styles.form}>
                {error && <p className={styles.error}>{error}</p>}
                {success && <p className={styles.success}>{success}</p>}

                <fieldset>
                    <legend>Album Details</legend>
                    <div className={styles.formGroup}>
                    <label htmlFor="title">Album Title</label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />
                    </div>
                    <div className={styles.formGroup}>
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    </div>
                </fieldset>

                <fieldset>
                    <legend>Visibility</legend>
                    <p className={styles.fieldDescription}>If no groups are selected, the album will be visible to everyone (public).</p>
                    <GroupSelector
                        groups={allGroups}
                        selectedGroups={visibleToGroups}
                        onSelectionChange={setVisibleToGroups}
                    />
                </fieldset>

                <Button type="submit" variant="primary">Create Album</Button>
                </form>
            </div>
        </div>
    </AdminLayout>
  );
}
