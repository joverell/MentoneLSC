import { useState } from 'react';

const Event = ({ event }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const description = event.description;
  const truncateLength = 200;

  const isLongDescription = description.length > truncateLength;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="event">
      <h3 dangerouslySetInnerHTML={{ __html: event.title }} />
      <p>
        <strong>Date:</strong>{' '}
        {new Date(event.start_date).toLocaleDateString('en-AU', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}{' '}
        at{' '}
        {new Date(event.start_date).toLocaleTimeString('en-AU', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
      <div
        dangerouslySetInnerHTML={{
          __html:
            isLongDescription && !isExpanded
              ? `${description.substring(0, truncateLength)}...`
              : description,
        }}
      />
      {isLongDescription && (
        <button onClick={toggleExpanded} className="read-more-btn">
          {isExpanded ? 'Read less' : 'Read more'}
        </button>
      )}
      {event.url && (
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="find-out-more-btn"
        >
          Find out more
        </a>
      )}
    </div>
  );
};

export default Event;
