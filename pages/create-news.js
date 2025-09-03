import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css'; // Import styles
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Form.module.css';
import BottomNav from '../components/BottomNav';
import { db } from '../src/firebase'; // Assuming you have this export
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";


// Dynamically import ReactQuill to avoid SSR issues
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

  // Protect the route
  if (loading || loadingGroups) {
    return <p>Loading...</p>;
  }
  if (!user) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return null; // Prevent rendering before redirect
  }

  // Image handler for the Quill editor
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        try {
            const storage = getStorage();
            // Create a unique file name
            const storageRef = ref(storage, `news-images/${Date.now()}_${file.name}`);

            // Upload the file
            const snapshot = await uploadBytes(storageRef, file);

            // Get the download URL
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Insert the image into the editor
            const quill = quillRef.current.getEditor();
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', downloadURL);

        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          setError("Failed to upload image. Please try again.");
        }
      }
    };
  };

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
  }), []);


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
