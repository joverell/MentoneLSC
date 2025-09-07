import { useState, useRef } from 'react';
import docStyles from '../../styles/Documents.module.css';
import { FaFileAlt, FaTimesCircle } from 'react-icons/fa';

const StyledFileInput = ({ onFileSelect }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            onFileSelect(file);
        }
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        onFileSelect(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleContainerClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <div className={docStyles.fileInputContainer} onClick={handleContainerClick}>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className={docStyles.hiddenFileInput}
                aria-hidden="true"
            />
            {selectedFile ? (
                <div className={docStyles.filePreview}>
                    <FaFileAlt className={docStyles.fileIcon} />
                    <span className={docStyles.fileName}>{selectedFile.name}</span>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent container click from triggering
                            handleRemoveFile();
                        }}
                        className={docStyles.removeFileButton}
                        aria-label="Remove file"
                    >
                        <FaTimesCircle />
                    </button>
                </div>
            ) : (
                <div className={docStyles.fileDropzone}>
                    <FaFileAlt className={docStyles.dropzoneIcon} />
                    <p>Click to browse or drag and drop your file here.</p>
                </div>
            )}
        </div>
    );
};

export default StyledFileInput;
