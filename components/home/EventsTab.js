import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../../styles/Home.module.css';
import EventCard from './EventCard';

// Helper function to decode HTML entities
function decode(str) {
    if (typeof window !== 'undefined') {
        const txt = document.createElement("textarea");
        txt.innerHTML = str;
        return txt.value;
    }
    return str;
}

const normalizeWordPressEvent = (event) => {
  const location = event.venue ? event.venue.venue : null;
  let description = event.description;

  // The Events Calendar plugin often includes a div with venue details.
  // This regex attempts to remove that block to prevent duplicate information.
  const venueDetailsRegex = /<div\s+class="tribe-events-venue-details">[\s\S]*?<\/div>/;
  description = description.replace(venueDetailsRegex, '');

  return {
    id: `wp-${event.id}`,
    title: decode(event.title),
    description: description, // Use the modified description
    startTime: new Date(event.start_date.replace(' ', 'T')), // More reliable parsing
    endTime: new Date(event.end_date.replace(' ', 'T')),
    location: location || 'See details',
    locationLink: location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}` : null,
    imageUrl: event.image?.sizes?.medium?.url || (event.image?.url || null),
    source: 'wordpress',
    externalUrl: event.url,
    rsvpTally: null,
    currentUserRsvpStatus: null,
  };
};

const normalizeInternalEvent = (event) => ({
  id: `internal-${event.id}`,
  title: event.title,
  description: `<p>${event.description.replace(/\n/g, '<br>')}</p>`, // Basic formatting
  startTime: new Date(event.start_time),
  endTime: new Date(event.end_time),
  location: event.location,
  locationLink: event.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}` : null,
  imageUrl: event.imageUrl || null,
  source: 'internal',
  externalUrl: null,
  rsvpTally: event.rsvpTally,
  currentUserRsvpStatus: event.currentUserRsvpStatus,
});


export default function EventsTab({ user, getIdToken }) {
    const router = useRouter();
    const [allEvents, setAllEvents] = useState([]);
    const [settings, setSettings] = useState({ wordpress: { enabled: true } });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [rsvpComments, setRsvpComments] = useState({});
    const [rsvpGuests, setRsvpGuests] = useState({});
    const [expandedRsvps, setExpandedRsvps] = useState(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/settings');
                const data = await res.json();
                if (res.ok) {
                    setSettings(data);
                }
            } catch (e) {
                console.error("Could not fetch settings", e);
            }
        };
        fetchSettings();
    }, []);

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const fetchPromises = [
                fetch('/api/events').catch(e => { console.error("Internal fetch error:", e); return { ok: false }; })
            ];

            if (settings.wordpress?.enabled) {
                fetchPromises.unshift(fetch('https://mentonelsc.com/wp-json/tribe/events/v1/events').catch(e => { console.error("WP fetch error:", e); return { ok: false }; }));
            }

            const responses = await Promise.all(fetchPromises);

            let wordpressEvents = [];
            if (settings.wordpress?.enabled) {
                const wpRes = responses.find(res => res.url && res.url.includes('mentonelsc.com'));
                if (wpRes && wpRes.ok) {
                    const data = await wpRes.json();
                    wordpressEvents = (data.events || []).map(normalizeWordPressEvent);
                } else {
                    console.warn("Could not fetch WordPress events.");
                }
            }

            const internalRes = responses.find(res => res.url && res.url.includes('/api/events'));
            let internalEvents = [];
            if (internalRes && internalRes.ok) {
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
    }, [settings]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents, settings]);

    const handleRsvpSubmit = async (eventId, status) => {
        const internalId = eventId.replace('internal-', '');
        const comment = rsvpComments[eventId] || '';
        const adultGuests = rsvpGuests[eventId]?.adults || 0;
        const kidGuests = rsvpGuests[eventId]?.kids || 0;

        if (!user || !getIdToken) {
            alert('You must be logged in to RSVP.');
            return;
        }

        try {
            const token = await getIdToken();
            const res = await fetch(`/api/events/${internalId}/rsvp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ status, comment, adultGuests, kidGuests }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Failed to submit RSVP');
            }
            // Refresh events and clear inputs
            fetchEvents();
            setRsvpComments(prev => ({ ...prev, [eventId]: '' }));
            setRsvpGuests(prev => ({ ...prev, [eventId]: { adults: '', kids: '' } }));
        } catch (err) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleRsvpChange = (type, eventId, value) => {
        if (type === 'comments') {
            setRsvpComments(prev => ({ ...prev, [eventId]: value }));
        } else if (type === 'guests') {
            setRsvpGuests(prev => ({ ...prev, [eventId]: value }));
        }
    };

    const handleToggleRsvpList = (eventId) => {
        setExpandedRsvps(expandedRsvps === eventId ? null : eventId);
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

            if (typeof window !== 'undefined') {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = event.description;
                const descriptionText = tempDiv.textContent || tempDiv.innerText || "";
                return titleLower.includes(searchLower) || descriptionText.toLowerCase().includes(searchLower);
            }

            return titleLower.includes(searchLower);
        });

    return (
        <div id="events" className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2>Club Events</h2>
                {user && user.roles && (user.roles.includes('Admin') || user.roles.includes('Group Admin')) && (
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
                        <EventCard
                            key={event.id}
                            event={event}
                            user={user}
                            onRsvpSubmit={handleRsvpSubmit}
                            onRsvpChange={handleRsvpChange}
                            rsvpComments={rsvpComments}
                            rsvpGuests={rsvpGuests}
                            expandedRsvps={expandedRsvps}
                            onToggleRsvpList={handleToggleRsvpList}
                        />
                    ))
                ) : (
                    !loading && !error && <p>{selectedDate ? 'No events found for this date.' : 'No upcoming events found.'}</p>
                )}
            </div>
        </div>
    );
}
