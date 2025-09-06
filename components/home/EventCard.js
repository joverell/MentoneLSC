import Link from 'next/link';
import styles from '../../styles/Home.module.css';

// Helper function to decode HTML entities
function decode(str) {
    if (typeof window !== 'undefined') {
        const txt = document.createElement("textarea");
        txt.innerHTML = str;
        return txt.value;
    }
    return str;
}

export default function EventCard({ event, user, onRsvpSubmit, onRsvpChange, rsvpComments, rsvpGuests, expandedRsvps, onToggleRsvpList }) {
    const isInternal = event.source === 'internal';
    const eventUrl = isInternal ? `/events/${event.id.replace('internal-', '')}` : event.externalUrl;
    const EventWrapper = isInternal ? ({ children }) => <Link href={eventUrl}>{children}</Link> : ({ children }) => <>{children}</>;

    return (
        <EventWrapper>
            <div key={event.id} className={styles.event}>
                {event.imageUrl && (
                    <img
                        src={event.imageUrl}
                        alt={event.title}
                        className={styles.eventImage}
                    />
                )}
                <div className={styles.eventContent}>
                    <h3>{decode(event.title)}</h3>
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

                    {event.source === 'internal' && (
                        <a className={styles.detailsLink}>View Details & RSVP</a>
                    )}

                    {event.source === 'internal' && user && (
                        <div className={styles.rsvpContainer}>
                            <h4>Your RSVP:</h4>
                            <div className={styles.rsvpButtons}>
                                <button
                                    onClick={(e) => { e.preventDefault(); onRsvpSubmit(event.id, 'Yes') }}
                                    className={event.currentUserRsvpStatus === 'Yes' ? styles.rsvpActive : ''}
                                >
                                    Yes
                                </button>
                                <button
                                    onClick={(e) => { e.preventDefault(); onRsvpSubmit(event.id, 'No') }}
                                    className={event.currentUserRsvpStatus === 'No' ? styles.rsvpActive : ''}
                                >
                                    No
                                </button>
                                <button
                                    onClick={(e) => { e.preventDefault(); onRsvpSubmit(event.id, 'Maybe') }}
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
                                    onChange={(e) => onRsvpChange('comments', event.id, e.target.value)}
                                    onClick={(e) => e.preventDefault()}
                                    className={styles.rsvpCommentInput}
                                />
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Adults"
                                    value={rsvpGuests[event.id]?.adults || ''}
                                    onChange={(e) => onRsvpChange('guests', event.id, { ...rsvpGuests[event.id], adults: e.target.value })}
                                    onClick={(e) => e.preventDefault()}
                                    className={styles.rsvpGuestInput}
                                />
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Kids"
                                    value={rsvpGuests[event.id]?.kids || ''}
                                    onChange={(e) => onRsvpChange('guests', event.id, { ...rsvpGuests[event.id], kids: e.target.value })}
                                    onClick={(e) => e.preventDefault()}
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
                                    onClick={(e) => { e.preventDefault(); onToggleRsvpList(event.id) }}
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
        </EventWrapper>
    );
}
