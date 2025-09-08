import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../../styles/Admin.module.css';
import { FaUsers, FaNewspaper, FaCalendarAlt, FaCog, FaDollarSign, FaFileAlt } from 'react-icons/fa';

const AdminLayout = ({ children }) => {
    const router = useRouter();

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: <FaUsers /> },
        { href: '/admin/users', label: 'Users', icon: <FaUsers /> },
        { href: '/admin/groups', label: 'Groups', icon: <FaUsers /> },
        { href: '/admin/news', label: 'News', icon: <FaNewspaper /> },
        { href: '/admin/events', label: 'Events', icon: <FaCalendarAlt /> },
        { href: '/admin/sponsors', label: 'Sponsors', icon: <FaDollarSign /> },
        { href: '/admin/document-categories', label: 'Doc Categories', icon: <FaFileAlt /> },
        { href: '/admin/settings', label: 'Settings', icon: <FaCog /> },
    ];

    return (
        <div className={styles.adminContainer}>
            <aside className={styles.sidebar}>
                <nav className={styles.adminNav}>
                    {navItems.map(item => (
                        <Link key={item.href} href={item.href} className={router.pathname === item.href ? styles.activeLink : ''}>
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </aside>
            <main className={styles.mainContent}>
                {children}
            </main>
        </div>
    );
};

export default AdminLayout;
