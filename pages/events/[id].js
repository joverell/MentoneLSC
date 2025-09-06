import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import BottomNav from '../../components/BottomNav';
import styles from '../../styles/Home.module.css';

export default function EventDetails() {
  const router = useRouter();
  const { id } = router.query;
  const { user, getIdToken } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rsvpStatus, setRsvpStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [comment, setComment] = useState('');
  const [adultGuests, setAdultGuests] = useState(0);
  const [kidGuests, setKidGuests] = useState(0);

  useEffect(() => {
    if (!id) return;

    const fetchEvent = async () => {
      try {
        const response = await fetch(`/api/events/${id}`);
        if (!response.ok) {
          throw new Error('Event not found');
        }
        const data = await response.json();
        setEvent(data);
        if (data.currentUserRsvp) {
            setRsvpStatus(data.currentUserRsvp.status || '');
            setComment(data.currentUserRsvp.comment || '');
            setAdultGuests(data.currentUserRsvp.adultGuests || 0);
            setKidGuests(data.currentUserRsvp.kidGuests || 0);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [id]);

  const handleRsvp = async (e) => {
    e.preventDefault();
    if (!user) {
      router.push('/account');
      return;
    }
    setIsSubmitting(true);
    setSuccessMessage('');
    setError('');
    try {
      const token = await getIdToken();
      if (!token) {
        throw new Error('You must be logged in to RSVP.');
      }
      const response = await fetch(`/api/events/${id}/rsvp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: rsvpStatus, comment, adultGuests, kidGuests }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to RSVP');
      }
      setSuccessMessage('Your RSVP has been saved!');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!event) return <div>Event not found.</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>{event.title}</h1>
      </header>
      <div className={styles.container}>
        <p>{event.description}</p>
        <p><strong>When:</strong> {new Date(event.start_time).toLocaleString()} - {new Date(event.end_time).toLocaleString()}</p>
        {event.location && <p><strong>Where:</strong> {event.location}</p>}

        {user && (
          <form onSubmit={handleRsvp} className={styles.rsvpForm}>
            <h3>RSVP</h3>
            {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <div className={styles.formGroup}>
              <label>Your Status</label>
              <select value={rsvpStatus} onChange={(e) => setRsvpStatus(e.target.value)} required>
                <option value="">Select...</option>
                <option value="Yes">Yes, I'll be there</option>
                <option value="No">No, I can't make it</option>
                <option value="Maybe">Maybe</option>
              </select>
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="adultGuests">Adult Guests</label>
                <input type="number" id="adultGuests" value={adultGuests} onChange={(e) => setAdultGuests(e.target.value)} min="0" />
            </div>
            <div className={styles.formGroup}>
                <label htmlFor="kidGuests">Kid Guests</label>
                <input type="number" id="kidGuests" value={kidGuests} onChange={(e) => setKidGuests(e.target.value)} min="0" />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="comment">Comment</label>
              <textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} rows="3"></textarea>
            </div>
            <button type="submit" disabled={isSubmitting || !rsvpStatus}>
              {isSubmitting ? 'Submitting...' : 'Submit RSVP'}
            </button>
          </form>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
