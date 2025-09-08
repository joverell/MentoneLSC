import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';
import { useAuth } from '../../context/AuthContext';
import formStyles from '../../styles/Form.module.css';
import newsStyles from '../../styles/News.module.css';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import FileUploadInput from '../FileUploadInput';
import GroupSelector from '../document/GroupSelector';
import Button from '../ui/Button';

const ReactQuill = dynamic(
  async () => {
    const { default: RQ } = await import('react-quill');
    // eslint-disable-next-line react/display-name
    return ({ forwardedRef, ...props }) => <RQ ref={forwardedRef} {...props} />;
  },
  { ssr: false }
);

export default function NewsForm({ article }) {
  const { user } = useAuth();
  const router = useRouter();
  const quillRef = useRef(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [allGroups, setAllGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setContent(article.content);
      setImageUrl(article.imageUrl || '');
      setSelectedGroups(article.visibleToGroups || []);
    }
  }, [article]);

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
  }, []);

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
  }), [imageHandler]);

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
      visibleToGroups: selectedGroups,
    };

    const isEditing = !!article;
    const url = isEditing ? `/api/news/${article.id}` : '/api/news';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'create'} article`);
      }

      setSuccess(`Article ${isEditing ? 'updated' : 'created'} successfully! Redirecting...`);
      setTimeout(() => {
        router.push(isEditing ? `/admin/news` : '/?tab=news');
      }, 2000);

    } catch (err) {
      setError(err.message);
    }
  };

  if (loadingGroups) {
    return <p>Loading groups...</p>;
  }

  return (
    <div className={newsStyles.createNewsContainer}>
        <form onSubmit={handleSubmit} className={formStyles.form}>
          {error && <p className={formStyles.error}>{error}</p>}
          {success && <p className={formStyles.success}>{success}</p>}

          <div className={formStyles.formGroup}>
            <label htmlFor="title">Title</label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className={formStyles.formGroup}>
            <label>Header Image (optional)</label>
            <FileUploadInput
              onUploadSuccess={(url) => setImageUrl(url)}
              folder="news"
            />
            {imageUrl && (
              <div className={newsStyles.imagePreview}>
                <p>Current image:</p>
                <img src={imageUrl} alt="News header" />
              </div>
            )}
          </div>

          <div className={formStyles.formGroup}>
            <label>Content</label>
            <div className={formStyles.quillEditor}>
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

          <div className={formStyles.formGroup}>
            <label>Visible To (optional)</label>
            <GroupSelector
                groups={allGroups}
                selectedGroups={selectedGroups}
                onSelectionChange={setSelectedGroups}
            />
          </div>

          <Button type="submit" variant="primary">{article ? 'Update Article' : 'Publish Article'}</Button>
        </form>
    </div>
  );
}
