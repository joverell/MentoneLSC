import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import AdminLayout from '../../components/admin/AdminLayout';
import styles from '../../styles/Admin.module.css';
import formStyles from '../../styles/Form.module.css';

const DocumentCategoriesPage = () => {
    const { getIdToken, loading: authLoading } = useAuth();
    const [categories, setCategories] = useState([]);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [editingCategory, setEditingCategory] = useState(null); // { id, name }
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const fetchCategories = useCallback(async () => {
        try {
            const token = await getIdToken();
            const res = await axios.get('/api/document-categories', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setCategories(res.data);
        } catch (err) {
            setError('Failed to fetch categories.');
        } finally {
            setIsLoading(false);
        }
    }, [getIdToken, setError, setIsLoading]);

    useEffect(() => {
        if (!authLoading) {
            fetchCategories();
        }
    }, [authLoading, fetchCategories]);

    const handleAddCategory = async (e) => {
        e.preventDefault();
        setError('');
        if (!newCategoryName.trim()) {
            setError('Category name cannot be empty.');
            return;
        }

        try {
            const token = await getIdToken();
            await axios.post('/api/document-categories', { name: newCategoryName }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNewCategoryName('');
            fetchCategories(); // Refresh list
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add category.');
        }
    };

    const handleUpdateCategory = async (id, name) => {
        setError('');
        if (!name.trim()) {
            setError('Category name cannot be empty.');
            return;
        }

        try {
            const token = await getIdToken();
            await axios.put(`/api/document-categories/${id}`, { name }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setEditingCategory(null);
            fetchCategories(); // Refresh list
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update category.');
        }
    };

    const handleDeleteCategory = async (id) => {
        if (window.confirm('Are you sure you want to delete this category?')) {
            setError('');
            try {
                const token = await getIdToken();
                await axios.delete(`/api/document-categories/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                fetchCategories(); // Refresh list
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete category.');
            }
        }
    };

    const startEditing = (category) => {
        setEditingCategory({ ...category });
    };

    const cancelEditing = () => {
        setEditingCategory(null);
    };

    return (
        <AdminLayout>
            <div className={styles.container}>
                <h1>Manage Document Categories</h1>
                {error && <p className={formStyles.error}>{error}</p>}

                <div className={styles.card}>
                    <h2>Add New Category</h2>
                    <form onSubmit={handleAddCategory} className={formStyles.form}>
                        <div className={formStyles.formGroup}>
                            <label htmlFor="newCategoryName">Category Name</label>
                            <input
                                type="text"
                                id="newCategoryName"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className={formStyles.input}
                                required
                            />
                        </div>
                        <button type="submit" className={formStyles.button}>Add Category</button>
                    </form>
                </div>

                <div className={styles.card}>
                    <h2>Existing Categories</h2>
                    {isLoading ? <p>Loading categories...</p> : (
                        <ul className={styles.list}>
                            {categories.map(cat => (
                                <li key={cat.id} className={styles.listItem}>
                                    {editingCategory && editingCategory.id === cat.id ? (
                                        <div className={styles.editForm}>
                                            <input
                                                type="text"
                                                value={editingCategory.name}
                                                onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                className={formStyles.input}
                                            />
                                            <button onClick={() => handleUpdateCategory(editingCategory.id, editingCategory.name)} className={styles.button}>Save</button>
                                            <button onClick={cancelEditing} className={styles.buttonSecondary}>Cancel</button>
                                        </div>
                                    ) : (
                                        <div className={styles.listItemContent}>
                                            <span>{cat.name}</span>
                                            <div className={styles.actions}>
                                                <button onClick={() => startEditing(cat)} className={styles.button}>Edit</button>
                                                <button onClick={() => handleDeleteCategory(cat.id)} className={styles.buttonSecondary}>Delete</button>
                                            </div>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default DocumentCategoriesPage;
