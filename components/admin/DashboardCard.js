import Link from 'next/link';
import styles from '../../styles/Admin.module.css';

const DashboardCard = ({ title, link, icon }) => {
    return (
        <Link href={link} className={styles.dashboardCard}>
            <div className={styles.cardIcon}>{icon}</div>
            <h3 className={styles.cardTitle}>{title}</h3>
        </Link>
    );
};

export default DashboardCard;
