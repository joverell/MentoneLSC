import styles from '../styles/BottomNav.module.css';
import { FaCalendarAlt, FaListAlt, FaInfoCircle } from 'react-icons/fa';

const BottomNav = ({ activeTab, setActiveTab }) => {
  return (
    <nav className={styles.nav}>
      <button
        className={`${styles.navButton} ${activeTab === 'events' ? styles.active : ''}`}
        onClick={() => setActiveTab('events')}
      >
        <FaListAlt />
        <span>Events</span>
      </button>
      <button
        className={`${styles.navButton} ${activeTab === 'calendar' ? styles.active : ''}`}
        onClick={() => setActiveTab('calendar')}
      >
        <FaCalendarAlt />
        <span>Calendar</span>
      </button>
      <button
        className={`${styles.navButton} ${activeTab === 'info' ? styles.active : ''}`}
        onClick={() => setActiveTab('info')}
      >
        <FaInfoCircle />
        <span>Info</span>
      </button>
    </nav>
  );
};

export default BottomNav;
