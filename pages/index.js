import Head from 'next/head';
import { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import styles from '../styles/Home.module.css';
import Weather from '../components/Weather';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetch('https://mentonelsc.com/wp-json/tribe/events/v1/events')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching events:', error);
        setError('Could not load events. Please try again later.');
        setLoading(false);
      });
  }, []);

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const hasEvent = events.some(event => {
        const eventDate = new Date(event.start_date);
        return (
          date.getFullYear() === eventDate.getFullYear() &&
          date.getMonth() === eventDate.getMonth() &&
          date.getDate() === eventDate.getDate()
        );
      });
      // This class is styled globally in Home.module.css because it's applied by an external library
      return hasEvent ? 'event-day' : null;
    }
    return null;
  };

  const handleDateChange = date => {
    setSelectedDate(date);
  };

  const filteredEvents = events
    .filter(event => {
      if (!selectedDate) return true;
      const eventDate = new Date(event.start_date);
      return (
        eventDate.getFullYear() === selectedDate.getFullYear() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getDate() === selectedDate.getDate()
      );
    })
    .filter(event => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      // Basic search in title and description. Note: description is HTML.
      const titleLower = event.title.toLowerCase();
      const descriptionLower = event.description.toLowerCase();
      return titleLower.includes(searchLower) || descriptionLower.includes(searchLower);
    });

  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Mentone LSC Hub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <header className={styles.header}>
        <a href="https://mentonelsc.com/" target="_blank" rel="noopener noreferrer">
          <img src="https://mentonelsc.com/wp-content/uploads/2021/03/cropped-C100-MLSC-logo-2-e1723032334453-80x81.jpg" alt="Mentone LSC Logo" />
        </a>
        <h1>Mentone LSC Hub</h1>
      </header>

      <div className={styles.container}>
        <Weather />
        <div id="calendar" className={styles.section}>
          <h2>Upcoming Activities</h2>
          <Calendar
            onClickDay={handleDateChange}
            tileClassName={tileClassName}
          />
        </div>

        <div id="events" className={styles.section}>
          <h2>Bar and Kitchen Events</h2>
          <div className={styles.eventControls}>
            <input
              type="text"
              placeholder="Search events..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {selectedDate && (
              <button onClick={() => setSelectedDate(null)} className={styles.clearFilterBtn}>
                Clear Filter
              </button>
            )}
          </div>
          <div className={styles.eventsContainer}>
            {loading && <p>Loading events...</p>}
            {error && <p>{error}</p>}
            {!loading && !error && filteredEvents.length > 0 ? (
              filteredEvents.map(event => (
                <div key={event.id} className={styles.event}>
                  {event.image && event.image.sizes && event.image.sizes.medium && (
                    <img
                      src={event.image.sizes.medium.url}
                      alt={event.title}
                      className={styles.eventImage}
                    />
                  )}
                  <div className={styles.eventContent}>
                    <h3 dangerouslySetInnerHTML={{ __html: event.title }} />
                    <p>
                      <strong>Date:</strong>{' '}
                      {new Date(event.start_date).toLocaleDateString('en-AU', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}{' '}
                      at{' '}
                      {new Date(event.start_date).toLocaleTimeString('en-AU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <div dangerouslySetInnerHTML={{ __html: event.description }} />
                    {event.url && (
                      <a href={event.url} target="_blank" rel="noopener noreferrer">
                        Find out more
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              !loading && !error && <p>{selectedDate ? 'No events found for this date.' : 'No upcoming events found.'}</p>
            )}
          </div>
        </div>

        <div id="membership" className={styles.section}>
          <h2>Membership</h2>
          <div className={styles.links}>
            <a href="https://mentonelsc.com/new-member/" target="_blank" rel="noopener noreferrer">
              New Member
            </a>
            <a href="https://mentonelsc.com/renewing-member/" target="_blank" rel="noopener noreferrer">
              Renewing Member
            </a>
          </div>
        </div>

        <div id="teamapp" className={styles.section}>
          <h2>TeamApp</h2>
          <div className={styles.links}>
            <a href="https://www.teamapp.com/v2/clubs/163380?_detail=v1" target="_blank" rel="noopener noreferrer">
              Visit TeamApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
