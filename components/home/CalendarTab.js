import { useState, useEffect, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import styles from '../../styles/Home.module.css';

export default function CalendarTab() {
    const [allEvents, setAllEvents] = useState([]);
    const [settings, setSettings] = useState({ wordpress: { enabled: true } });
    const [isModalOpen, setIsModalOpen] = useState(false);

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
                    wordpressEvents = (data.events || []).map(event => ({
                        startTime: new Date(event.start_date.replace(' ', 'T')),
                    }));
                }
            }

            const internalRes = responses.find(res => res.url && res.url.includes('/api/events'));
            let internalEvents = [];
            if (internalRes && internalRes.ok) {
                const data = await internalRes.json();
                internalEvents = data.map(event => ({
                    startTime: new Date(event.start_time),
                }));
            }

            setAllEvents([...wordpressEvents, ...internalEvents]);
        } catch (err) {
            console.error('Error fetching events for calendar:', err);
        }
    }, [settings]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents, settings]);

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
            return hasEvent ? styles.eventMarker : null;
        }
        return null;
    };

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

    return (
        <div id="calendar" className={styles.section}>
            <CalendarSubscriptionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
            <div className={styles.sectionHeader}>
                <h2>Upcoming Activities</h2>
                <button onClick={() => setIsModalOpen(true)} className={styles.subscribeBtn}>
                    Subscribe
                </button>
            </div>
            <Calendar
                tileClassName={tileClassName}
            />
        </div>
    );
}
