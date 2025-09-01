import { useState } from 'react';
import styles from '../styles/Home.module.css';

const ExpandableArticle = ({ article, plainTextContent }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 300; // Maximum characters to show before truncating

  const isLongArticle = plainTextContent.length > maxLength;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={styles.newsArticle}>
      <h3>{article.title}</h3>
      <p className={styles.articleMeta}>
        By {article.authorName} on {new Date(article.createdAt).toLocaleDateString('en-AU')}
      </p>
      <div
        className={styles.articleContent}
        dangerouslySetInnerHTML={{
          __html: isExpanded
            ? article.content.replace(/\n/g, '<br />')
            : `${plainTextContent.substring(0, maxLength).replace(/\n/g, '<br />')}...`
        }}
      />
      {isLongArticle && (
        <button onClick={handleToggle} className={styles.readMoreBtn}>
          {isExpanded ? 'Read Less' : 'Read More'}
        </button>
      )}
    </div>
  );
};

export default ExpandableArticle;
