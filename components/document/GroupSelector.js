import { useState, useMemo } from 'react';
import docStyles from '../../styles/Documents.module.css';
import { FaSearch } from 'react-icons/fa';

const GroupSelector = ({ groups = [], selectedGroups, onSelectionChange }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredGroups = useMemo(() => {
        // Ensure groups is an array before filtering
        const validGroups = Array.isArray(groups) ? groups : [];
        return validGroups.filter(group =>
            group.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [groups, searchTerm]);

    const handleCheckboxChange = (groupId) => {
        const newSelection = selectedGroups.includes(groupId)
            ? selectedGroups.filter(id => id !== groupId)
            : [...selectedGroups, groupId];
        onSelectionChange(newSelection);
    };

    const handleSelectAll = () => {
        if (selectedGroups.length === filteredGroups.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(filteredGroups.map(g => g.id));
        }
    };

    return (
        <div className={docStyles.groupSelector}>
            <div className={docStyles.groupSelectorHeader}>
                <div className={docStyles.searchContainer}>
                    <FaSearch className={docStyles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search groups..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={docStyles.searchInput}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleSelectAll}
                    className={docStyles.selectAllButton}
                >
                    {selectedGroups.length === filteredGroups.length ? 'Deselect All' : 'Select All'}
                </button>
            </div>
            <div className={docStyles.checkboxGrid}>
                {filteredGroups.map(group => (
                    <div key={group.id} className={docStyles.checkboxWrapper}>
                        <input
                            type="checkbox"
                            id={`group-${group.id}`}
                            value={group.id}
                            checked={selectedGroups.includes(group.id)}
                            onChange={() => handleCheckboxChange(group.id)}
                        />
                        <label htmlFor={`group-${group.id}`}>{group.name}</label>
                    </div>
                ))}
            </div>
             <small>If no groups are selected, the document will be public.</small>
        </div>
    );
};

export default GroupSelector;
