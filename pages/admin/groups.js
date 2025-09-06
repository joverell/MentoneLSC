import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import styles from '../../styles/Admin.module.css';
import BottomNav from '../../components/BottomNav';
import Link from 'next/link';

export default function GroupManagement() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newGroupName, setNewGroupName] = useState('');
  const [editState, setEditState] = useState({}); // { [id]: 'newName' }

  useEffect(() => {
    if (authLoading) return;
    if (!user || !user.roles.includes('Admin')) {
      router.push('/');
      return;
    }
    fetchGroups();
  }, [user, authLoading, router]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/access_groups');
      if (!res.ok) throw new Error('Failed to fetch access groups');
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/access_groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create group');
      }
      setNewGroupName('');
      fetchGroups(); // Refresh list
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (groupId) => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/access_groups/${groupId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete group');
      fetchGroups(); // Refresh list
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdate = async (groupId) => {
    setError(null);
    const newName = editState[groupId];
    if (!newName) return;
    try {
      const res = await fetch(`/api/access_groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update group');
      }
      setEditState(prev => ({ ...prev, [groupId]: undefined }));
      fetchGroups(); // Refresh list
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading || loading) return <p>Loading...</p>;
  if (!user || !user.roles.includes('Admin')) return <p>Redirecting...</p>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Access Group Management</h1>
      </header>
      <div className={styles.container}>
        <div className={styles.adminNav}>
          <Link href="/admin/users" className={styles.adminNavLink}>Manage Users</Link>
          <span style={{ margin: '0 1rem' }}>|</span>
          <Link href="/admin/news" className={styles.adminNavLink}>Manage News</Link>
          <span style={{ margin: '0 1rem' }}>|</span>
          <Link href="/admin/settings" className={styles.adminNavLink}>Settings</Link>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.formSection}>
          <h3>Create New Group</h3>
          <form onSubmit={handleCreate} className={styles.inlineForm}>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="New group name"
              required
            />
            <button type="submit" className={styles.button}>Create</button>
          </form>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>Group Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.id}>
                  <td>
                    {editState[group.id] !== undefined ? (
                      <input
                        type="text"
                        value={editState[group.id]}
                        onChange={(e) => setEditState(prev => ({ ...prev, [group.id]: e.target.value }))}
                      />
                    ) : (
                      group.name
                    )}
                  </td>
                  <td className={styles.actionsCell}>
                    {editState[group.id] !== undefined ? (
                      <>
                        <button onClick={() => handleUpdate(group.id)} className={styles.saveBtn}>Save</button>
                        <button onClick={() => setEditState(prev => ({ ...prev, [group.id]: undefined }))} className={styles.cancelBtn}>Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setEditState(prev => ({ ...prev, [group.id]: group.name }))} className={styles.editBtn}>Edit</button>
                    )}
                    <Link href={`/admin/groups/${group.id}`} className={styles.manageBtn}>
                      Manage Members
                    </Link>
                    <button onClick={() => handleDelete(group.id)} className={styles.deleteBtn}>Delete</button>
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
