import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/ui/Button';
import styles from '../../styles/Admin.module.css';

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
            <h1 className={styles.pageTitle}>Manage Document Categories</h1>
            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.formSection}>
                <h3>Add New Category</h3>
                <form onSubmit={handleAddCategory}>
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="New category name"
                        required
                    />
                    <Button type="submit" variant="primary">Add Category</Button>
                </form>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.userTable}>
                    <thead>
                        <tr>
                            <th>Category Name</th>
                            <th>Document Count</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(cat => (
                            <tr key={cat.id}>
                                <td>
                                    {editingCategory && editingCategory.id === cat.id ? (
                                        <input
                                            type="text"
                                            value={editingCategory.name}
                                            onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                        />
                                    ) : (
                                        cat.name
                                    )}
                                </td>
                                <td>{cat.docCount}</td>
                                <td className={styles.actionsCell}>
                                    {editingCategory && editingCategory.id === cat.id ? (
                                        <>
                                            <Button onClick={() => handleUpdateCategory(editingCategory.id, editingCategory.name)} variant="primary">Save</Button>
                                            <Button onClick={cancelEditing} variant="secondary">Cancel</Button>
                                        </>
                                    ) : (
                                        <>
                                            <Button onClick={() => startEditing(cat)} variant="primary">Edit</Button>
                                            <Button onClick={() => handleDeleteCategory(cat.id)} variant="danger">Delete</Button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
};

export default DocumentCategoriesPage;
