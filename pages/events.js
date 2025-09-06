import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Default styling for react-calendar
import { useRouter } from 'next/router';
import Link from 'next/link';
import BottomNav from '../components/BottomNav';
import styles from '../styles/Home.module.css'; // Using home styles for consistency

export default function EventsCalendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data = await response.json();
        setEvents(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  const handleDateClick = (date) => {
    // Find events on the clicked date
    const eventsOnDate = events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === date.toDateString();
    });

    if (eventsOnDate.length > 0) {
      // Navigate to the first event on that day
      router.push(`/events/${eventsOnDate[0].id}`);
    }
  };

  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const eventsOnDate = events.filter(event => {
        const eventDate = new Date(event.start_time);
        return eventDate.toDateString() === date.toDateString();
      });
      return eventsOnDate.length > 0 ? <div className={styles.eventMarker}></div> : null;
    }
  };

  const handleSubscribe = () => {
    // The browser will handle the .ics file download
    window.location.href = '/api/events/ical';
  };

  if (loading) return <div>Loading events...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Club Events Calendar</h1>
      </header>
      <div className={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/?tab=events" className={styles.button}>
            Switch to List View
          </Link>
          <button onClick={handleSubscribe} className={styles.subscribeBtn}>
            Subscribe to Calendar
          </button>
        </div>
        <Calendar
          onClickDay={handleDateClick}
          tileContent={tileContent}
          className={styles.calendar}
        />
      </div>
      <BottomNav />
    </div>
  );
}
