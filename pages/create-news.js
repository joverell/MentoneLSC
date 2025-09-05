import { useState, useMemo, useRef, useCallback, useEffect } from 'react'; // Added useCallback
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Form.module.css';
import BottomNav from '../components/BottomNav';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill');
    // eslint-disable-next-line react/display-name
    return ({ forwardedRef, ...props }) => <RQ ref={forwardedRef} {...props} />;
  },
  { ssr: false }
);

export default function CreateNews() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const quillRef = useRef(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [allGroups, setAllGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
        try {
            const res = await fetch('/api/access_groups');
            if (!res.ok) throw new Error('Failed to fetch access groups');
            const data = await res.json();
            setAllGroups(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingGroups(false);
        }
    };
    fetchGroups();
  }, []);

  // FIX: Wrap imageHandler in useCallback to make it stable
  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        try {
            const storage = getStorage();
            const storageRef = ref(storage, `news-images/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            const quill = quillRef.current.getEditor();
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', downloadURL);

        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          setError("Failed to upload image. Please try again.");
        }
      }
    };
  }, []); // Empty dependency array because it doesn't depend on any props or state

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: imageHandler,
      },
    },
  }), [imageHandler]); // FIX: Add the stable imageHandler as a dependency

  const handleGroupChange = (groupId) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!title || !content || content === '<p><br></p>') {
      setError('Please fill in both title and content.');
      return;
    }

    const payload = {
        title,
        content,
        imageUrl,
        visibleToGroups: Array.from(selectedGroups),
    };

    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create article');
      }

      setSuccess('Article created successfully! Redirecting...');
      setTimeout(() => {
        router.push('/?tab=news');
      }, 2000);

    } catch (err) {
      setError(err.message);
    }
  };

  // Return null during loading or before user is checked
  if (loading || loadingGroups) {
    return <p>Loading...</p>;
  }
  if (!user) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return null;
  }

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1>Create News Article</h1>
      </header>
      <div className={styles.container}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <div className={styles.formGroup}>
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="imageUrl">Image URL (optional)</label>
            <input
              type="text"
              id="imageUrl"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>

          <div className={styles.formGroup}>
            <label>Content</label>
            <div className={styles.quillEditor}>
                <ReactQuill
                    forwardedRef={quillRef}
                    theme="snow"
                    value={content}
                    onChange={setContent}
                    modules={modules}
                    placeholder="Write your article content here..."
                />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Visible To (optional)</label>
            <p className={styles.fieldDescription}>If no groups are selected, the article will be visible to everyone.</p>
            <div className={styles.checkboxGrid}>
                {allGroups.map(group => (
                    <div key={group.id} className={styles.checkboxWrapper}>
                        <input
                            type="checkbox"
                            id={`group-${group.id}`}
                            checked={selectedGroups.has(group.id)}
                            onChange={() => handleGroupChange(group.id)}
                        />
                        <label htmlFor={`group-${group.id}`}>{group.name}</label>
                    </div>
                ))}
            </div>
          </div>

          <button type="submit" className={styles.button}>Publish Article</button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}
