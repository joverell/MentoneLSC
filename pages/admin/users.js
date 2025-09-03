import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../../styles/Admin.module.css';
import BottomNav from '../../components/BottomNav';

export default function UserManagement() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reminderStatus, setReminderStatus] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  const handleSendReminders = async () => {
    setReminderStatus('Sending...');
    try {
      const res = await fetch('/api/events/reminders', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send reminders');
      }
      setReminderStatus(data.message);
    } catch (err) {
      setReminderStatus(`Error: ${err.message}`);
    }
  };

  useEffect(() => {
    if (authLoading) return; // Wait for authentication to resolve

    if (!user || !user.roles.includes('Admin')) {
      // Redirect if not an admin
      router.push('/');
      return;
    }

    fetchUsers();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <p>Loading...</p>;
  }

  // This check is for the brief moment after authLoading is false but user is not yet set
  if (!user || !user.roles.includes('Admin')) {
    return <p>Redirecting...</p>;
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>User Management</h1>
      </header>
      <div className={styles.container}>
        <div className={styles.adminNav}>
          <Link href="/admin/groups" className={styles.adminNavLink}>Manage Groups</Link>
          <span style={{ margin: '0 1rem' }}>|</span>
          <Link href="/admin/news" className={styles.adminNavLink}>Manage News</Link>
          <span style={{ margin: '0 1rem' }}>|</span>
          <Link href="/admin/events" className={styles.adminNavLink}>Manage Events</Link>
          <span style={{ margin: '0 1rem' }}>|</span>
          <Link href="/admin/sponsors" className={styles.adminNavLink}>Manage Sponsors</Link>
          <span style={{ margin: '0 1rem' }}>|</span>
          <button onClick={handleSendReminders} className={styles.adminNavLink}>Send Event Reminders</button>
          {reminderStatus && <p style={{ marginLeft: '1rem', display: 'inline' }}>{reminderStatus}</p>}
        </div>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.tableContainer}>
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Roles</th>
                <th>Groups</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.roles.join(', ')}</td>
                  <td>{u.groupIds.map(id => groups[id] || 'Unknown').join(', ')}</td>
                  <td>
                    <Link href={`/admin/users/${u.id}`} className={styles.manageLink}>
                      Manage
                    </Link>
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
