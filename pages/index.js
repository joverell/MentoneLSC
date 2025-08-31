import Head from 'next/head';
import { useEffect, useState } from 'react';
import CalendarComponent from '../components/Calendar';
import Event from '../components/Event';

export default function Home() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

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

  const handleDateChange = date => {
    setSelectedDate(date);
  };

  const filteredEvents = selectedDate
    ? events.filter(event => {
        const eventDate = new Date(event.start_date);
        return eventDate.toDateString() === selectedDate.toDateString();
      })
    : events;

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
        <div id="calendar-section" className="section">
          <h2>Events Calendar</h2>
          <CalendarComponent onDateChange={handleDateChange} />
        </div>

        <div id="events" className="section">
          <h2>
            {selectedDate
              ? `Events for ${selectedDate.toLocaleDateString('en-AU', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}`
              : 'All Events'}
          </h2>
          <div id="events-container">
            {loading && <p>Loading events...</p>}
            {error && <p>{error}</p>}
            {!loading && !error && filteredEvents.length > 0 ? (
              filteredEvents.map(event => <Event key={event.id} event={event} />)
            ) : (
              !loading && !error && <p>No events found for this date.</p>
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
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap');

        body {
          font-family: 'Montserrat', sans-serif;
          margin: 0;
          background-color: #f0f4f8;
          color: #333;
        }
        header {
          background: url('https://www.transparenttextures.com/patterns/wavecut.png'), linear-gradient(to right, #007bff, #0056b3);
          color: white;
          padding: 40px 20px;
          text-align: center;
          position: relative;
        }
        header img {
          max-width: 120px;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          margin-bottom: 10px;
        }
        h1 {
          margin: 0;
          font-size: 2.5rem;
          font-weight: 700;
        }
        h2 {
          color: #0056b3;
          text-align: center;
          font-size: 2rem;
          margin-bottom: 20px;
        }
        .container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .section {
          margin-bottom: 40px;
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }
        #events-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 30px;
        }
        .event {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding:.event {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          background-color: #fff;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .event:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 15px rgba(0,0,0,0.15);
        }
        .event h3 {
          color: #d9534f;
          margin-top: 0;
        }
        .event p {
          line-height: 1.6;
        }
        .event a {
          color: #f0ad4e;
          text-decoration: none;
          font-weight: bold;
        }
        .event a:hover {
          text-decoration: underline;
        }
        .links a {
          display: block;
          padding: 15px;
          background-color: #f0ad4e;
          color: white;
          text-decoration: none;
          margin-bottom: 10px;
          border-radius: 5px;
          text-align: center;
          font-weight: bold;
          transition: background-color 0.3s ease;
        }
        .links a:hover {
          background-color: #ec971f;
        }
        .calendar-container {
          display: flex;
          justify-content: center;
          margin-bottom: 20px;
        }
        .react-calendar {
          width: 100%;
          max-width: 450px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-family: 'Montserrat', sans-serif;
        }
        .read-more-btn {
          background-color: #f0ad4e;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 10px;
        }
        .read-more-btn:hover {
          background-color: #ec971f;
        }
        .find-out-more-btn {
          display: inline-block;
          margin-top: 10px;
          margin-left: 10px;
        }
      `}</style>
    </div>
  );
}
