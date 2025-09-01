import styles from '../styles/BottomNav.module.css';
import { FaCalendarAlt, FaListAlt, FaInfoCircle, FaUserCircle, FaNewspaper, FaUsersCog, FaComment } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';

const NavLink = ({ href, icon, label, active }) => (
  <Link href={href} passHref>
    <a className={`${styles.navButton} ${active ? styles.active : ''}`}>
      {icon}
      <span>{label}</span>
    </a>
  </Link>
);

const BottomNav = () => {
  const router = useRouter();
  const { pathname } = router;
  const { user } = useAuth();

  // This component will now manage its own state based on the current route
  return (
    <nav className={styles.nav}>
      <NavLink
        href="/?tab=news"
        icon={<FaNewspaper />}
        label="News"
        active={pathname === '/' && router.query.tab === 'news'}
      />
      <NavLink
        href="/?tab=events"
        icon={<FaListAlt />}
        label="Events"
        active={pathname === '/' && (router.query.tab === 'events' || !router.query.tab)}
      />
      <NavLink
        href="/?tab=calendar"
        icon={<FaCalendarAlt />}
        label="Calendar"
        active={pathname === '/' && router.query.tab === 'calendar'}
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
