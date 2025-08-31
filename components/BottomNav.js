import styles from '../styles/BottomNav.module.css';
import { FaCalendarAlt, FaListAlt, FaInfoCircle, FaUserCircle } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/router';

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

  // This component will now manage its own state based on the current route
  return (
    <nav className={styles.nav}>
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
      <NavLink
        href="/account"
        icon={<FaUserCircle />}
        label="Account"
        active={pathname === '/account'}
      />
      <NavLink
        href="/?tab=info"
        icon={<FaInfoCircle />}
        label="Info"
        active={pathname === '/' && router.query.tab === 'info'}
      />
    </nav>
  );
};

export default BottomNav;
