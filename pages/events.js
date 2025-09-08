import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import { useAuth } from '../context/AuthContext';
import EventsTab from '../components/home/EventsTab';
import { fetchWithAuth } from '../utils/auth-fetch';

export default function EventsCalendar() {
    const { user, getIdToken } = useAuth();
    const [events, setEvents] = useState([]);
    const [settings, setSettings] = useState({ mergeCalendarAndEvents: { enabled: false } });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const fetchSettingsAndEvents = async () => {
            setLoading(true);
            try {
                // Fetch settings first
                const settingsRes = await fetchWithAuth('/api/settings');
                const settingsData = await settingsRes.json();
                if (settingsRes.ok) {
                    setSettings(settingsData);
                } else {
                    throw new Error('Failed to fetch settings');
                }

                // Then fetch events
                const eventPromises = [fetch('/api/events/public').then(res => res.json())];
                if (user) {
                    eventPromises.push(fetchWithAuth('/api/events').then(res => res.json()));
                }

                const eventsData = await Promise.all(eventPromises);
                const combinedEvents = eventsData.flat();
                setEvents(combinedEvents);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSettingsAndEvents();
    }, [user]);

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
        <>
            <header className={styles.header}>
                <h1>Club Events</h1>
            </header>
            <main>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem' }}>
                    <button onClick={handleSubscribe} className={styles.subscribeBtn}>
                        Subscribe to Calendar
                    </button>
                </div>
                <Calendar
                    onClickDay={handleDateClick}
                    tileContent={tileContent}
                    className={styles.calendar}
                />

                {settings.mergeCalendarAndEvents?.enabled && (
                    <div style={{ marginTop: '2rem' }}>
                        <EventsTab user={user} getIdToken={getIdToken} />
                    </div>
                )}
            </main>
        </>
    );
}

export async function getStaticProps() {
    return {
        props: {
            title: 'Events',
        },
    };
}
