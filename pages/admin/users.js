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
  const [groups, setGroups] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reminderStatus, setReminderStatus] = useState('');

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
      router.push('/');
      return;
    }

    const fetchData = async () => {
      try {
        const [usersRes, groupsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/access_groups'),
        ]);

        if (!usersRes.ok) {
          const data = await usersRes.json();
          throw new Error(data.message || 'Failed to fetch users');
        }
        const usersData = await usersRes.json();
        setUsers(usersData);

        if (!groupsRes.ok) {
            const data = await groupsRes.json();
            throw new Error(data.message || 'Failed to fetch groups');
        }
        const groupsData = await groupsRes.json();
        const groupsMap = groupsData.reduce((acc, group) => {
            acc[group.id] = group.name;
            return acc;
        }, {});
        setGroups(groupsMap);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <p>Loading...</p>;
  }

  // This check is for the brief moment after authLoading is false but user is not yet set
  if (!user || !user.roles.includes('Admin')) {
    return <p>Redirecting...</p>;
  }

  return (
    <div className={styles.container}>
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
          <Link href="/admin/settings" className={styles.adminNavLink}>Settings</Link>
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
                  <td data-label="Name">{u.name}</td>
                  <td data-label="Email">{u.email}</td>
                  <td data-label="Roles">{u.roles ? u.roles.join(', ') : 'N/A'}</td>
                  <td data-label="Groups">{u.groupIds && u.groupIds.length > 0 ? u.groupIds.map(id => groups[id] || 'Unknown').join(', ') : 'None'}</td>
                  <td data-label="Actions" className={styles.actionsCell}>
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
