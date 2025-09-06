import styles from '../../styles/Home.module.css';
import Sponsors from '../Sponsors';

export default function InfoTab() {
    return (
        <div id="info-section" className={styles.section}>
            <h2>Club Information</h2>
            <p>Important club documents and links can be found here.</p>
            <div className={styles.links}>
                <a href="https://mentonelsc.com/new-member/" target="_blank" rel="noopener noreferrer">
                    New Member Information
                </a>
                <a href="https://mentonelsc.com/renewing-member/" target="_blank" rel="noopener noreferrer">
                    Renewing Member Information
                </a>
                <a href="https://donate.charidy.com/14361" target="_blank" rel="noopener noreferrer">
                    Donate to the Club
                </a>
            </div>
            <Sponsors />
        </div>
    );
}
