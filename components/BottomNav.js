import styles from '../styles/BottomNav.module.css';
import { FaCalendarAlt, FaListAlt, FaInfoCircle, FaUserCircle, FaNewspaper, FaUsersCog, FaComment, FaFileAlt, FaImages } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

const NavLink = ({ href, icon, label, active }) => (
  <Link href={href} className={`${styles.navButton} ${active ? styles.active : ''}`}>
    {icon}
    <span>{label}</span>
  </Link>
);

const BottomNav = () => {
  const router = useRouter();
  const { pathname } = router;
  const { user } = useAuth();
  const [settings, setSettings] = useState({ mergeCalendarAndEvents: { enabled: false } });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (res.ok) {
          setSettings(data);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    };

    fetchSettings();
  }, []);

  // This component will now manage its own state based on the current route
  return (
    <nav className={styles.nav}>
      <NavLink
        href="/?tab=news"
        icon={<FaNewspaper />}
        label="News"
        active={pathname === '/' && router.query.tab === 'news'}
      />
      {!settings.mergeCalendarAndEvents?.enabled && (
        <NavLink
          href="/?tab=events"
          icon={<FaListAlt />}
          label="Events"
          active={pathname === '/' && (router.query.tab === 'events' || !router.query.tab)}
        />
      )}
      <NavLink
        href="/events"
        icon={<FaCalendarAlt />}
        label="Calendar"
        active={pathname.startsWith('/events')}
      />
      {user && (
        <NavLink
          href="/chat"
          icon={<FaComment />}
          label="Chat"
          active={pathname.startsWith('/chat')}
        />
      )}
      <NavLink
        href="/documents"
        icon={<FaFileAlt />}
        label="Docs"
        active={pathname.startsWith('/documents')}
      />
      <NavLink
        href="/gallery"
        icon={<FaImages />}
        label="Gallery"
        active={pathname.startsWith('/gallery')}
      />
      <NavLink
        href="/?tab=info"
        icon={<FaInfoCircle />}
        label="Info"
        active={pathname === '/' && router.query.tab === 'info'}
      />
      {user && user.roles && user.roles.includes('Admin') && (
        <NavLink
          href="/admin/users"
          icon={<FaUsersCog />}
          label="Admin"
          active={pathname.startsWith('/admin')}
        />
      )}
       <NavLink
        href="/account"
        icon={<FaUserCircle />}
        label="Account"
        active={pathname === '/account'}
      />
    </nav>
  );
};

export default BottomNav;
