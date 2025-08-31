import Head from 'next/head';
import { useEffect, useState } from 'react';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('https://mentonelsc.com/wp-json/tribe/events/v1/events')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        setEvents(data.events || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching events:', error);
        setError('Could not load events. Please try again later.');
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <Head>
        <title>Mentone LSC Hub</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <header>
        <img src="https://mentonelsc.com/wp-content/uploads/2021/03/cropped-C100-MLSC-logo-2-e1723032334453-80x81.jpg" alt="Mentone LSC Logo" />
        <h1>Mentone LSC Hub</h1>
      </header>

      <div className="container">
        <div id="events" className="section">
          <h2>Bar and Kitchen Events</h2>
          <div id="events-container">
            {loading && <p>Loading events...</p>}
            {error && <p>{error}</p>}
            {!loading && !error && events.length > 0 ? (
              events.map(event => (
                <div key={event.id} className="event">
                  <h3>{event.title}</h3>
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
                  <div dangerouslySetInnerHTML={{ __html: event.description }} />
                  {event.url && (
                    <a href={event.url} target="_blank" rel="noopener noreferrer">
                      Find out more
                    </a>
                  )}
                </div>
              ))
            ) : (
              !loading && !error && <p>No upcoming events found.</p>
            )}
          </div>
        </div>

        <div id="membership" className="section">
          <h2>Membership</h2>
          <div className="links">
            <a href="https://mentonelsc.com/new-member/" target="_blank" rel="noopener noreferrer">
              New Member
            </a>
            <a href="https://mentonelsc.com/renewing-member/" target="_blank" rel="noopener noreferrer">
              Renewing Member
            </a>
          </div>
        </div>

        <div id="teamapp" className="section">
          <h2>TeamApp</h2>
          <div className="links">
            <a href="https://www.teamapp.com/v2/clubs/163380?_detail=v1" target="_blank" rel="noopener noreferrer">
              Visit TeamApp
            </a>
          </div>
        </div>
      </div>

      <style jsx global>{`
        body {
          font-family: sans-serif;
          margin: 0;
        }
        header {
          background-color: #f8f8f8;
          padding: 20px;
          text-align: center;
        }
        header img {
          max-width: 100px;
        }
        h1,
        h2 {
          text-align: center;
        }
        .container {
          padding: 20px;
        }
        .section {
          margin-bottom: 30px;
        }
        .section h2 {
          border-bottom: 2px solid #eee;
          padding-bottom: 10px;
        }
        #events-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .event {
          border: 1px solid #ddd;
          padding: 15px;
          border-radius: 5px;
        }
        .links a {
          display: block;
          padding: 15px;
          background-color: #007bff;
          color: white;
          text-decoration: none;
          margin-bottom: 10px;
          border-radius: 5px;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
