import docStyles from '../../styles/Documents.module.css';
import { FaFileArchive } from 'react-icons/fa';
import UploadForm from './UploadForm';

const EmptyState = ({ isAdmin, accessGroups, onUploadSuccess }) => {
    return (
        <div className={docStyles.emptyStateContainer}>
            <div className={docStyles.emptyStateContent}>
                <FaFileArchive className={docStyles.emptyStateIcon} />
                <h2>No Documents Found</h2>
                <p>There are currently no documents available. {isAdmin ? "Why not upload one?" : ""}</p>
            </div>
            {isAdmin && (
                <div className={docStyles.emptyStateUpload}>
                    <UploadForm
                        accessGroups={accessGroups}
                        onUploadSuccess={onUploadSuccess}
                    />
                </div>
            )}
        </div>
    );
};

export default EmptyState;
