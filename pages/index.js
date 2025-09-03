import Head from 'next/head';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import styles from '../styles/Home.module.css';
import Weather from '../components/Weather';
import BottomNav from '../components/BottomNav';
import Sponsors from '../components/Sponsors';
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
  const [activeCommentSection, setActiveCommentSection] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [rsvpComments, setRsvpComments] = useState({});
  const [rsvpGuests, setRsvpGuests] = useState({}); // Will store { [eventId]: { adults: 0, kids: 0 } }
  const [expandedRsvps, setExpandedRsvps] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    const internalId = eventId.replace('internal-', '');
    const comment = rsvpComments[eventId] || '';
    const adultGuests = rsvpGuests[eventId]?.adults || 0;
    const kidGuests = rsvpGuests[eventId]?.kids || 0;

    try {
      const res = await fetch(`/api/events/${internalId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const fetchNews = useCallback(async () => {
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
  }, []);

  // Effect for fetching news
  useEffect(() => {
    if (activeTab === 'news') {
        fetchNews();
    }
  }, [activeTab, fetchNews]);

  const handleLikeClick = async (articleId) => {
    if (!user) {
        router.push('/login');
        return;
    }

    // Optimistic UI update
    const originalArticles = [...newsArticles];
    const newArticles = newsArticles.map(article => {
        if (article.id === articleId) {
            const newLikeCount = article.currentUserHasLiked ? article.likeCount - 1 : article.likeCount + 1;
            return {
                ...article,
                likeCount: newLikeCount,
                currentUserHasLiked: !article.currentUserHasLiked
            };
        }
        return article;
    });
    setNewsArticles(newArticles);

    try {
        const res = await fetch(`/api/news/${articleId}/like`, { method: 'POST' });
        if (!res.ok) {
            // Revert on failure
            setNewsArticles(originalArticles);
            const data = await res.json();
            // Display an error message to the user
            alert(data.message || "Failed to update like status.");
        }
    } catch (error) {
        // Revert on failure
        setNewsArticles(originalArticles);
        alert("An error occurred. Please try again.");
    }
  };

  const fetchComments = async (articleId) => {
    // Set loading state for comments on a specific article
    setNewsArticles(prev => prev.map(a => a.id === articleId ? { ...a, commentsLoading: true } : a));
    try {
        const res = await fetch(`/api/news/${articleId}/comments`);
        if (!res.ok) throw new Error('Failed to fetch comments');
        const comments = await res.json();
        // Add comments to the specific article
        setNewsArticles(prev => prev.map(a => a.id === articleId ? { ...a, comments, commentsLoading: false } : a));
    } catch (err) {
        console.error("Error fetching comments:", err);
        // Handle error state for comments on a specific article
        setNewsArticles(prev => prev.map(a => a.id === articleId ? { ...a, commentsError: err.message, commentsLoading: false } : a));
    }
  };

  const toggleComments = (articleId) => {
    const article = newsArticles.find(a => a.id === articleId);
    if (activeCommentSection === articleId) {
        setActiveCommentSection(null);
    } else {
        setActiveCommentSection(articleId);
        // Fetch comments only if they haven't been fetched before
        if (!article.comments) {
            fetchComments(articleId);
        }
    }
  };

  const handleCommentSubmit = async (e, articleId) => {
    e.preventDefault();
    if (!user) {
        router.push('/login');
        return;
    }
    if (!newComment.trim()) return;

    const originalArticles = [...newsArticles];
    const tempComment = {
        id: `temp-${Date.now()}`,
        content: newComment,
        authorName: user.name,
        createdAt: new Date().toISOString(),
        isTemporary: true,
    };

    // Optimistic UI update
    setNewsArticles(prev => prev.map(a => a.id === articleId ? { ...a, comments: [...(a.comments || []), tempComment] } : a));
    setNewComment('');

    try {
        const res = await fetch(`/api/news/${articleId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: newComment }),
        });

        if (!res.ok) {
            // Revert on failure
            setNewsArticles(originalArticles);
            alert('Failed to post comment.');
            return;
        }

        const savedComment = await res.json();
        // Replace temporary comment with the real one from the server
        setNewsArticles(prev => prev.map(a => a.id === articleId ? { ...a, comments: a.comments.map(c => c.id === tempComment.id ? savedComment : c) } : a));

    } catch (error) {
        console.error("Error submitting comment:", error);
        setNewsArticles(originalArticles);
        alert('An error occurred while posting your comment.');
    }
  };

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

const CalendarSubscriptionModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const subscriptionUrl = `${window.location.origin}/api/events/ical`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(subscriptionUrl).then(() => {
      alert('Subscription link copied to clipboard!');
    }, (err) => {
      alert('Failed to copy link. Please copy it manually.');
      console.error('Could not copy text: ', err);
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <h2>Subscribe to Calendar</h2>
        <p>Copy the following link and add it to your preferred calendar application (e.g., Google Calendar, Apple Calendar, Outlook).</p>
        <input type="text" value={subscriptionUrl} readOnly className={styles.modalInput} />
        <div className={styles.modalActions}>
          <button onClick={copyToClipboard} className={styles.button}>Copy Link</button>
          <button onClick={onClose} className={`${styles.button} ${styles.buttonSecondary}`}>Close</button>
        </div>
      </div>
    </div>
  );
};

// ... inside the Home component's return statement ...
  return (
    <div className={styles.pageContainer}>
      <CalendarSubscriptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
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
                    {article.imageUrl && <img src={article.imageUrl} alt={article.title} className={styles.newsImage} />}
                    <h3>{article.title}</h3>
                    <p className={styles.articleMeta}>
                      By {article.authorName} on {new Date(article.createdAt).toLocaleDateString('en-AU')}
                    </p>
                    <div dangerouslySetInnerHTML={{ __html: article.content }} />
                    <div className={styles.articleActions}>
                        <button
                            onClick={() => handleLikeClick(article.id)}
                            className={`${styles.likeButton} ${article.currentUserHasLiked ? styles.liked : ''}`}
                            disabled={!user}
                            title={!user ? "Log in to like posts" : ""}
                        >
                            <span role="img" aria-label="like">👍</span> {article.likeCount}
                        </button>
                        <button onClick={() => toggleComments(article.id)} className={styles.commentButton}>
                            <span role="img" aria-label="comment">💬</span> Comment
                        </button>
                    </div>

                    {activeCommentSection === article.id && (
                        <div className={styles.commentsSection}>
                            {article.commentsLoading && <p>Loading comments...</p>}
                            {article.commentsError && <p className={styles.error}>{article.commentsError}</p>}
                            {article.comments && article.comments.length > 0 && (
                                <div className={styles.commentsList}>
                                    {article.comments.map(comment => (
                                        <div key={comment.id} className={`${styles.comment} ${comment.isTemporary ? styles.temporaryComment : ''}`}>
                                            <p><strong>{comment.authorName}</strong></p>
                                            <p>{comment.content}</p>
                                            <span className={styles.commentDate}>
                                                {new Date(comment.createdAt).toLocaleString('en-AU')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {article.comments && article.comments.length === 0 && <p>No comments yet.</p>}

                            {user ? (
                                <form onSubmit={(e) => handleCommentSubmit(e, article.id)} className={styles.commentForm}>
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Write a comment..."
                                        rows="2"
                                        required
                                    />
                                    <button type="submit">Post</button>
                                </form>
                            ) : (
                                <p>You must be <Link href="/login">logged in</Link> to comment.</p>
                            )}
                        </div>
                    )}
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
            <div className={styles.sectionHeader}>
              <h2>Upcoming Activities</h2>
              <button onClick={() => setIsModalOpen(true)} className={styles.subscribeBtn}>
                Subscribe
              </button>
            </div>
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
                      {event.location && (
                        <p>
                          <strong>Location:</strong>{' '}
                          {event.locationLink ? (
                            <a href={event.locationLink} target="_blank" rel="noopener noreferrer">
                              {event.location}
                            </a>
                          ) : (
                            event.location
                          )}
                        </p>
                      )}
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
                          <div className={styles.rsvpInputsContainer}>
                            <input
                              type="text"
                              placeholder="Add a comment (e.g., running late)"
                              value={rsvpComments[event.id] || ''}
                              onChange={(e) => setRsvpComments(prev => ({ ...prev, [event.id]: e.target.value }))}
                              className={styles.rsvpCommentInput}
                            />
                            <input
                              type="number"
                              min="0"
                              placeholder="Adults"
                              value={rsvpGuests[event.id]?.adults || ''}
                              onChange={(e) => setRsvpGuests(prev => ({ ...prev, [event.id]: { ...prev[event.id], adults: e.target.value } }))}
                              className={styles.rsvpGuestInput}
                            />
                            <input
                              type="number"
                              min="0"
                              placeholder="Kids"
                              value={rsvpGuests[event.id]?.kids || ''}
                              onChange={(e) => setRsvpGuests(prev => ({ ...prev, [event.id]: { ...prev[event.id], kids: e.target.value } }))}
                              className={styles.rsvpGuestInput}
                            />
                          </div>
                        </div>
                      )}

                      {event.source === 'internal' && user && user.roles.includes('Admin') && event.rsvpTally && (
                        <>
                          <div className={styles.rsvpTally}>
                            <strong>Tally:</strong> {event.rsvpTally.yes} Yes, {event.rsvpTally.no} No, {event.rsvpTally.maybe} Maybe
                            (<strong>Guests:</strong> {event.rsvpTally.guests} total)
                            <button
                              onClick={() => setExpandedRsvps(expandedRsvps === event.id ? null : event.id)}
                              className={styles.toggleRsvpListBtn}
                            >
                              {expandedRsvps === event.id ? 'Hide List' : 'Show List'}
                            </button>
                          </div>
                          {expandedRsvps === event.id && (
                            <div className={styles.rsvpListContainer}>
                              <table className={styles.rsvpTable}>
                                <thead>
                                  <tr>
                                    <th>Name</th>
                                    <th>Status</th>
                                    <th>Adults</th>
                                    <th>Kids</th>
                                    <th>Comment</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {event.rsvps && event.rsvps.map(rsvp => (
                                    <tr key={rsvp.userId}>
                                      <td>{rsvp.userName}</td>
                                      <td>{rsvp.status}</td>
                                      <td>{rsvp.adultGuests}</td>
                                      <td>{rsvp.kidGuests}</td>
                                      <td>{rsvp.comment}</td>
                                    </tr>
                                  ))}
                                  {(!event.rsvps || event.rsvps.length === 0) && (
                                    <tr><td colSpan="5">No RSVPs yet.</td></tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
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
            <Sponsors />
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
