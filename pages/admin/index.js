import AdminLayout from '../../components/admin/AdminLayout';
import DashboardCard from '../../components/admin/DashboardCard';
import styles from '../../styles/Admin.module.css';
import { FaUsers, FaNewspaper, FaCalendarAlt, FaBullhorn, FaCog, FaDollarSign } from 'react-icons/fa';

export default function AdminDashboard() {
    const adminSections = [
        { title: 'Users', link: '/admin/users', icon: <FaUsers /> },
        { title: 'Groups', link: '/admin/groups', icon: <FaUsers /> },
        { title: 'News', link: '/admin/news', icon: <FaNewspaper /> },
        { title: 'Events', link: '/admin/events', icon: <FaCalendarAlt /> },
        { title: 'Sponsors', link: '/admin/sponsors', icon: <FaDollarSign /> },
        { title: 'Settings', link: '/admin/settings', icon: <FaCog /> },
    ];

    return (
        <AdminLayout>
            <h1 className={styles.pageTitle}>Admin Dashboard</h1>
            <div className={styles.dashboardGrid}>
                {adminSections.map(section => (
                    <DashboardCard
                        key={section.title}
                        title={section.title}
                        link={section.link}
                        icon={section.icon}
                    />
                ))}
            </div>
        </AdminLayout>
    );
}
