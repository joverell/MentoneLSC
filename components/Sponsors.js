import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';

export default function Sponsors() {
    const [sponsors, setSponsors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSponsors = async () => {
            try {
                const res = await fetch('/api/sponsors');
                if (res.ok) {
                    const data = await res.json();
                    setSponsors(data);
                }
            } catch (error) {
                console.error('Failed to fetch sponsors', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSponsors();
    }, []);

    if (loading) {
        return <p>Loading sponsors...</p>;
    }

    if (sponsors.length === 0) {
        return null; // Don't render anything if there are no sponsors
    }

    return (
        <div className={styles.sponsorsContainer}>
            <h3>Our Sponsors</h3>
            <div className={styles.sponsorsGrid}>
                {sponsors.map(sponsor => (
                    <a key={sponsor.id} href={sponsor.websiteUrl} target="_blank" rel="noopener noreferrer" className={styles.sponsorLink}>
                        <img src={sponsor.logoUrl} alt={`${sponsor.name} logo`} />
                    </a>
                ))}
            </div>
        </div>
    );
}
