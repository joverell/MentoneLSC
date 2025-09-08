import { useRouter } from 'next/router';
import styles from '../styles/Home.module.css';
import Weather from '../components/Weather';
import EventsTab from '../components/home/EventsTab';
import NewsTab from '../components/home/NewsTab';
import CalendarTab from '../components/home/CalendarTab';
import InfoTab from '../components/home/InfoTab';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { user, getIdToken } = useAuth();
  const router = useRouter();
  const activeTab = router.query.tab || 'events';

  return (
    <>
      <header className={styles.header}>
        <a href="https://mentonelsc.com/" target="_blank" rel="noopener noreferrer">
          <img src="https://lh3.googleusercontent.com/a/ACg8ocJ6ORu45K50sJufG0lJGMZ5n6KvqlEyMHN-7euIGvYw3S-ysmg=s288-c-no" alt="Mentone LSC Logo" />
        </a>
        <h1>Mentone LSC Hub</h1>
        <Weather />
      </header>

      <div className={styles.container}>
        {activeTab === 'events' && <EventsTab user={user} getIdToken={getIdToken} />}
        {activeTab === 'news' && <NewsTab user={user} />}
        {activeTab === 'calendar' && <CalendarTab />}
        {activeTab === 'info' && <InfoTab />}
      </div>
    </>
  );
}
