import docStyles from '../../styles/Documents.module.css';
import { FaFilePdf, FaFileWord, FaFileExcel, FaFilePowerpoint, FaFileAlt, FaTrash, FaPencilAlt } from 'react-icons/fa';

const getFileIcon = (fileName) => {
    if (typeof fileName !== 'string' || !fileName.includes('.')) {
        return <FaFileAlt />;
    }
    const extension = fileName.split('.').pop().toLowerCase();
    if (extension === 'pdf') return <FaFilePdf />;
    if (['doc', 'docx'].includes(extension)) return <FaFileWord />;
    if (['xls', 'xlsx'].includes(extension)) return <FaFileExcel />;
    if (['ppt', 'pptx'].includes(extension)) return <FaFilePowerpoint />;
    return <FaFileAlt />;
};

const DocumentList = ({ documents, categories, isAdmin, onDelete, onEdit }) => {
    const categoryMap = categories.reduce((acc, cat) => {
        acc[cat.id] = cat.name;
        return acc;
    }, {});

    const groupedDocuments = documents.reduce((acc, doc) => {
        const categoryName = categoryMap[doc.categoryId] || 'Uncategorized';
        (acc[categoryName] = acc[categoryName] || []).push(doc);
        return acc;
    }, {});

    return (
        <div>
            {Object.entries(groupedDocuments).map(([category, docs]) => (
                <div key={category} className={docStyles.documentCategory}>
                    <h2 className={docStyles.categoryTitle}>{category}</h2>
                    <ul className={docStyles.documentList}>
                        {docs.map(doc => {
                            const docTitle = doc.title || 'Untitled';
                            return (
                                <li key={doc.id} className={docStyles.documentListItem}>
                                    <a href={doc.downloadURL} target="_blank" rel="noopener noreferrer" className={docStyles.documentLink}>
                                        <div className={docStyles.fileIconContainer}>
                                            {getFileIcon(docTitle)}
                                        </div>
                                        <span className={docStyles.documentTitle}>{docTitle}</span>
                                    </a>
                                    {isAdmin && (
                                        <div className={docStyles.adminButtons}>
                                            <button onClick={() => onEdit(doc)} className={docStyles.editButton}>
                                                <FaPencilAlt />
                                            </button>
                                            <button onClick={() => onDelete(doc.id)} className={docStyles.deleteButton}>
                                                <FaTrash />
                                            </button>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ))}
        </div>
    );
};

export default DocumentList;
