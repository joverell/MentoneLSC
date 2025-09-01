import Head from 'next/head';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import styles from '../styles/Home.module.css';
import Weather from '../components/Weather';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';

// Helper function to decode HTML entities
function decode(str) {
    if (typeof window !== 'undefined') {
        const txt = document.createElement("textarea");
        txt.innerHTML = str;
        return txt.value;
    }
    return str;
}


const normalizeWordPressEvent = (event) => ({
  id: `wp-${event.id}`,
  title: decode(event.title),
  description: event.description, // Keep as HTML
  startTime: new Date(event.start_date.replace(' ', 'T')), // More reliable parsing
  endTime: new Date(event.end_date.replace(' ', 'T')),
  location: event.venue ? event.venue.venue : 'See details',
  imageUrl: event.image?.sizes?.medium?.url || (event.image?.url || null),
  source: 'wordpress',
  externalUrl: event.url,
  rsvpTally: null,
  currentUserRsvpStatus: null,
});

const normalizeInternalEvent = (event) => ({
  id: `internal-${event.id}`,
  title: event.title,
  description: `<p>${event.description.replace(/\n/g, '<br>')}</p>`, // Basic formatting
  startTime: new Date(event.start_time),
  endTime: new Date(event.end_time),
  location: event.location,
  imageUrl: null, // No image support for internal events yet
  source: 'internal',
  externalUrl: null,
  rsvpTally: event.rsvpTally,
  currentUserRsvpStatus: event.currentUserRsvpStatus,
});


export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [allEvents, setAllEvents] = useState([]);
  const [newsArticles, setNewsArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newsError, setNewsError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const activeTab = router.query.tab || 'events';

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const [wpRes, internalRes] = await Promise.all([
        fetch('https://mentonelsc.com/wp-json/tribe/events/v1/events').catch(e => { console.error("WP fetch error:", e); return { ok: false }; }),
        fetch('/api/events').catch(e => { console.error("Internal fetch error:", e); return { ok: false }; })
      ]);

      let wordpressEvents = [];
      if (wpRes.ok) {
        const data = await wpRes.json();
        wordpressEvents = (data.events || []).map(normalizeWordPressEvent);
      } else {
        console.warn("Could not fetch WordPress events.");
      }

      let internalEvents = [];
      if (internalRes.ok) {
        const data = await internalRes.json();
        internalEvents = data.map(normalizeInternalEvent);
      } else {
        console.warn("Could not fetch internal events.");
      }

      const combinedEvents = [...wordpressEvents, ...internalEvents];
      combinedEvents.sort((a, b) => a.startTime - b.startTime);

      setAllEvents(combinedEvents);
      setError(null);
    } catch (err) {
      console.error('Error processing events:', err);
      setError('Could not load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRsvpSubmit = async (eventId, status) => {
    // Note: eventId here is the normalized one, e.g., "internal-123"
    const internalId = eventId.replace('internal-', '');
    try {
      const res = await fetch(`/api/events/${internalId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }), // Comment field can be added later
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to submit RSVP');
      }
      // Refresh events to show the new RSVP status
      fetchEvents();
    } catch (err) {
      alert(`Error: ${err.message}`); // Simple error feedback for now
    }
  };

  // Effect for fetching news
  useEffect(() => {
    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const res = await fetch('/api/news');
        if (!res.ok) throw new Error('Failed to fetch news');
        const data = await res.json();
        setNewsArticles(data);
        setNewsError(null);
      } catch (err) {
        console.error(err);
        setNewsError('Could not load news. Please try again later.');
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNews();
  }, []);

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const hasEvent = allEvents.some(event => {
        const eventDate = event.startTime;
        return (
          date.getFullYear() === eventDate.getFullYear() &&
          date.getMonth() === eventDate.getMonth() &&
          date.getDate() === eventDate.getDate()
        );
      });
      return hasEvent ? styles.eventDay : null;
    }
    return null;
  };

  const handleDateChange = date => {
    setSelectedDate(date);
    router.push('/?tab=events', undefined, { shallow: true });
  };

  const filteredEvents = allEvents
    .filter(event => {
      if (!selectedDate) return true;
      const eventDate = event.startTime;
      return (
        eventDate.getFullYear() === selectedDate.getFullYear() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getDate() === selectedDate.getDate()
      );
    })
    .filter(event => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      const titleLower = event.title.toLowerCase();

      // Client-side only: Create a temporary div to strip HTML for searching description
      if (typeof window !== 'undefined') {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = event.description;
        const descriptionText = tempDiv.textContent || tempDiv.innerText || "";
        return titleLower.includes(searchLower) || descriptionText.toLowerCase().includes(searchLower);
      }

      // SSR fallback: only search title
      return titleLower.includes(searchLower);
    });

  return (
    <div className={styles.pageContainer}>
      <Head>
        <title>Mentone LSC Hub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <header className={styles.header}>
        <a href="https://mentonelsc.com/" target="_blank" rel="noopener noreferrer">
          <img src="https://lh3.googleusercontent.com/a/ACg8ocJ6ORu45K50sJufG0lJGMZ5n6KvqlEyMHN-7euIGvYw3S-ysmg=s288-c-no" alt="Mentone LSC Logo" />
        </a>
        <h1>Mentone LSC Hub</h1>
        <Weather />
      </header>

      <div className={styles.container}>

        {activeTab === 'news' && (
          <div id="news" className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Club News</h2>
              {user && user.roles && user.roles.includes('Admin') && (
                <Link href="/create-news" className={styles.createEventBtn}>
                  + Create Article
                </Link>
              )}
            </div>
            <div className={styles.newsContainer}>
              {newsLoading && <p>Loading news...</p>}
              {newsError && <p>{newsError}</p>}
              {!newsLoading && !newsError && newsArticles.length > 0 ? (
                newsArticles.map(article => (
                  <div key={article.id} className={styles.newsArticle}>
                    <h3>{article.title}</h3>
                    <p className={styles.articleMeta}>
                      By {article.authorName} on {new Date(article.createdAt).toLocaleDateString('en-AU')}
                    </p>
                    <div dangerouslySetInnerHTML={{ __html: article.content.replace(/\n/g, '<br />') }} />
                  </div>
                ))
              ) : (
                !newsLoading && !newsError && <p>No news articles found.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div id="calendar" className={styles.section}>
            <h2>Upcoming Activities</h2>
            <Calendar
              onClickDay={handleDateChange}
              tileClassName={tileClassName}
            />
          </div>
        )}

        {activeTab === 'events' && (
          <div id="events" className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Club Events</h2>
              {user && user.roles && user.roles.includes('Admin') && (
                <Link href="/create-event" className={styles.createEventBtn}>
                  + Create Event
                </Link>
              )}
            </div>
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
                  Clear Date Filter
                </button>
              )}
            </div>
            <div className={styles.eventsContainer}>
              {loading && <p>Loading events...</p>}
              {error && <p>{error}</p>}
              {!loading && !error && filteredEvents.length > 0 ? (
                filteredEvents.map(event => (
                  <div key={event.id} className={styles.event}>
                    {event.imageUrl && (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className={styles.eventImage}
                      />
                    )}
                    <div className={styles.eventContent}>
                      <h3>{event.title}</h3>
                      <p>
                        <strong>Date:</strong>{' '}
                        {event.startTime.toLocaleDateString('en-AU', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        {event.startTime.toLocaleTimeString('en-AU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <div dangerouslySetInnerHTML={{ __html: event.description }} />
                      {event.externalUrl && (
                        <a href={event.externalUrl} target="_blank" rel="noopener noreferrer">
                          Find out more
                        </a>
                      )}

                      {event.source === 'internal' && user && (
                        <div className={styles.rsvpContainer}>
                          <h4>Your RSVP:</h4>
                          <div className={styles.rsvpButtons}>
                            <button
                              onClick={() => handleRsvpSubmit(event.id, 'Yes')}
                              className={event.currentUserRsvpStatus === 'Yes' ? styles.rsvpActive : ''}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => handleRsvpSubmit(event.id, 'No')}
                              className={event.currentUserRsvpStatus === 'No' ? styles.rsvpActive : ''}
                            >
                              No
                            </button>
                            <button
                              onClick={() => handleRsvpSubmit(event.id, 'Maybe')}
                              className={event.currentUserRsvpStatus === 'Maybe' ? styles.rsvpActive : ''}
                            >
                              Maybe
                            </button>
                          </div>
                        </div>
                      )}

                      {event.source === 'internal' && user && user.roles.includes('Admin') && event.rsvpTally && (
                        <div className={styles.rsvpTally}>
                          <strong>Tally:</strong> {event.rsvpTally.yes} Yes, {event.rsvpTally.no} No, {event.rsvpTally.maybe} Maybe
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                !loading && !error && <p>{selectedDate ? 'No events found for this date.' : 'No upcoming events found.'}</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <div id="info-section" className={styles.section}>
            <h2>Club Information</h2>
            <p>Important club documents and links can be found here.</p>
            <div className={styles.links}>
              <a href="https://mentonelsc.com/new-member/" target="_blank" rel="noopener noreferrer">
                New Member Information
              </a>
              <a href="https://mentonelsc.com/renewing-member/" target="_blank" rel="noopener noreferrer">
                Renewing Member Information
              </a>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
