import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import styles from '../../../styles/Admin.module.css';
import AdminLayout from '../../../components/admin/AdminLayout';
import FileUploadInput from '../../../components/FileUploadInput';

// Helper function to format a date for datetime-local input
const formatDateTimeForInput = (date) => {
  if (!date) return '';
  // Firestore timestamps might be objects with _seconds and _nanoseconds
  const d = new Date(date._seconds ? date._seconds * 1000 : date);
  if (isNaN(d.getTime())) return ''; // Return empty string for invalid dates
  // Pad with leading zeros if necessary
  const pad = (num) => (num < 10 ? '0' : '') + num;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};


export default function EditEvent() {
  const { user: adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id: eventId } = router.query;

  const [eventData, setEventData] = useState(null);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [rsvps, setRsvps] = useState([]);
  const [showRsvps, setShowRsvps] = useState(false);

  const fetchRsvps = async () => {
    if (!eventId) return;
    try {
      const res = await fetch(`/api/events/${eventId}/rsvps`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to fetch RSVPs');
      }
      const data = await res.json();
      setRsvps(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleRsvps = () => {
    if (!showRsvps) {
      fetchRsvps();
    }
    setShowRsvps(!showRsvps);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser) {
      router.push('/account');
      return;
    }

    const fetchData = async () => {
      if (!eventId) return;
      try {
        setLoading(true);
        const [eventRes, groupsRes] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch('/api/access_groups'),
        ]);

        if (!eventRes.ok) {
          const data = await eventRes.json();
          throw new Error(data.message || 'Failed to fetch event data');
        }
        const eventDetails = await eventRes.json();
        setEventData({
          ...eventDetails,
          start_time: formatDateTimeForInput(eventDetails.start_time),
          end_time: formatDateTimeForInput(eventDetails.end_time),
          visibleToGroups: eventDetails.visibleToGroups || [],
        });

        if (!groupsRes.ok) {
          const data = await groupsRes.json();
          throw new Error(data.message || 'Failed to fetch groups');
        }
        const groupsData = await groupsRes.json();
        setAllGroups(groupsData);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventId, adminUser, authLoading, router]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEventData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e) => {
    const { name, value, checked } = e.target;
    setEventData(prev => {
      const currentValues = prev[name] || [];
      if (checked) {
        return { ...prev, [name]: [...currentValues, value] };
      } else {
        return { ...prev, [name]: currentValues.filter(item => item !== value) };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update event');
      }
      setSuccess('Event updated successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const res = await fetch(`/api/events/${eventId}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to delete event');
        }
        router.push('/admin/events');
      } catch (err) {
        setError(err.message);
      }
    }
  };

  if (loading || authLoading) return <p>Loading...</p>;
  if (!adminUser) return <p>Redirecting...</p>;
  if (error) return <p className={styles.error}>{error}</p>;
  if (!eventData) return <p>Event not found.</p>;

  return (
    <AdminLayout>
      <h1 className={styles.pageTitle}>Edit Event: {eventData.title}</h1>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="title">Title</label>
          <input type="text" id="title" name="title" value={eventData.title || ''} onChange={handleInputChange} required />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" value={eventData.description || ''} onChange={handleInputChange} required />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="start_time">Start Time</label>
          <input type="datetime-local" id="start_time" name="start_time" value={eventData.start_time} onChange={handleInputChange} required />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="end_time">End Time</label>
          <input type="datetime-local" id="end_time" name="end_time" value={eventData.end_time} onChange={handleInputChange} required />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="location">Location</label>
          <input type="text" id="location" name="location" value={eventData.location || ''} onChange={handleInputChange} />
        </div>
        <div className={styles.formGroup}>
          <label>Image</label>
          <FileUploadInput
            onUploadSuccess={(url) => setEventData(prev => ({ ...prev, imageUrl: url }))}
            folder="events"
          />
          {eventData.imageUrl && (
            <div className={styles.imagePreview}>
              <p>Current image:</p>
              <img src={eventData.imageUrl} alt="Event" style={{ maxWidth: '200px', marginTop: '10px' }} />
            </div>
          )}
        </div>
        <div className={styles.formGroup}>
          <label>Visible To Groups</label>
          <div className={styles.checkboxGroup}>
            {allGroups.map(group => (
              <label key={group.id}>
                <input
                  type="checkbox"
                  name="visibleToGroups"
                  value={group.id}
                  checked={eventData.visibleToGroups.includes(group.id)}
                  onChange={handleCheckboxChange}
                />
                {group.name}
              </label>
            ))}
          </div>
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}
        <button type="submit" className={styles.button}>Save Changes</button>
        <button type="button" onClick={handleDelete} className={`${styles.button} ${styles.deleteBtn}`}>Delete Event</button>
      </form>

      <div className={styles.rsvpSection}>
        <button type="button" onClick={handleToggleRsvps} className={styles.button}>
          {showRsvps ? 'Hide' : 'Show'} RSVPs ({rsvps.length})
        </button>
        {showRsvps && (
          <div className={styles.tableContainer}>
            <h3>RSVP List</h3>
            {rsvps.length > 0 ? (
              <table className={styles.userTable}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Guests (Adults/Kids)</th>
                    <th>Comment</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {rsvps.map(rsvp => (
                    <tr key={rsvp.userId}>
                      <td>{rsvp.userName}</td>
                      <td>{rsvp.rsvp}</td>
                      <td>{rsvp.adultGuests || 0} / {rsvp.kidGuests || 0}</td>
                      <td>{rsvp.comment}</td>
                      <td>{new Date(rsvp.timestamp._seconds * 1000).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No RSVPs yet.</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
