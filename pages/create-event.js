import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Form.module.css';
import BottomNav from '../components/BottomNav';

export default function CreateEvent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [allGroups, setAllGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [loadingGroups, setLoadingGroups] = useState(true);

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

  // Protect the route
  if (loading || loadingGroups) {
    return <p>Loading...</p>;
  }
  if (!user) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return null; // Return null to prevent rendering before redirect
  }

  const handleGroupChange = (groupId) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title || !description || !startTime || !endTime) {
      setError('Please fill in all required fields.');
      return;
    }

    const payload = {
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      location,
      imageUrl,
      visibleToGroups: Array.from(selectedGroups),
    };

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create event');
      }

      setSuccess('Event created successfully! Redirecting...');
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>Create New Event</h1>
      </header>
      <div className={styles.container}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <div className={styles.formGroup}>
            <label htmlFor="title">Event Title</label>
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
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="start_time">Start Time</label>
            <input
              type="datetime-local"
              id="start_time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="end_time">End Time</label>
            <input
              type="datetime-local"
              id="end_time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="imageUrl">Image URL (Optional)</label>
            <input
              type="url"
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className={styles.formGroup}>
            <label>Visible To (optional)</label>
            <p className={styles.fieldDescription}>If no groups are selected, the event will be visible to everyone.</p>
            <div className={styles.checkboxGrid}>
                {allGroups.map(group => (
                    <div key={group.id} className={styles.checkboxWrapper}>
                        <input
                            type="checkbox"
                            id={`group-${group.id}`}
                            checked={selectedGroups.has(group.id)}
                            onChange={() => handleGroupChange(group.id)}
                        />
                        <label htmlFor={`group-${group.id}`}>{group.name}</label>
                    </div>
                ))}
            </div>
          </div>

          <button type="submit" className={styles.button}>Create Event</button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}
