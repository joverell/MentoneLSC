import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '../../styles/Admin.module.css';
import AdminLayout from '../../components/admin/AdminLayout';

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
    <AdminLayout>
      <h1 className={styles.pageTitle}>Event Management</h1>
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
                  <Link href={`/admin/events/${event.id}`}>
                    <a className={styles.editBtn}>Edit</a>
                  </Link>
                  <button onClick={() => handleDelete(event.id)} className={styles.deleteBtn}>
                    Delete
                  </button>
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
    </AdminLayout>
  );
}
