import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../../styles/Admin.module.css';
import BottomNav from '../../components/BottomNav';

export default function EventManagement() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/events');
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to fetch events');
      }
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user || !user.roles.includes('Admin')) {
      router.push('/');
      return;
    }
    fetchEvents();
  }, [user, authLoading, router]);

  const handleDelete = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete event');
      }
      fetchEvents(); // Refresh list
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading || loading) return <p>Loading...</p>;
  if (!user || !user.roles.includes('Admin')) return <p>Redirecting...</p>;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>Event Management</h1>
      </header>
      <div className={styles.container}>
        <div className={styles.adminNav}>
            <Link href="/admin/users" className={styles.adminNavLink}>Manage Users</Link>
            <span style={{ margin: '0 1rem' }}>|</span>
            <Link href="/admin/groups" className={styles.adminNavLink}>Manage Groups</Link>
            <span style={{ margin: '0 1rem' }}>|</span>
            <Link href="/admin/news" className={styles.adminNavLink}>Manage News</Link>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.tableContainer}>
          <table className={styles.userTable}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Date</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td>{event.title}</td>
                  <td>{new Date(event.start_time).toLocaleString()}</td>
                  <td>{event.location}</td>
                  <td>
                    <Link href={`/admin/events/${event.id}`} className={styles.manageLink}>
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {events.length === 0 && (
                <tr>
                  <td colSpan="4">No events found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
