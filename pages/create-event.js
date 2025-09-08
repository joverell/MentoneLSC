import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Form.module.css';
import { GoogleMap, useLoadScript, Marker, StandaloneSearchBox } from '@react-google-maps/api';
import FileUploadInput from '../components/FileUploadInput';

// Define libraries outside the component to prevent re-renders
const libraries = ['places'];

export default function CreateEvent() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [recurrence, setRecurrence] = useState({
    enabled: false,
    frequency: 'weekly',
    endDate: '',
  });
  const [allGroups, setAllGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [loadingGroups, setLoadingGroups] = useState(true);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    libraries: libraries, // Use the constant here
  });

  const [map, setMap] = useState(null);
  const [searchBox, setSearchBox] = useState(null);
  const [markerPosition, setMarkerPosition] = useState(null);

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
  };

  const center = {
    lat: -37.975,
    lng: 145.075,
  };

  useEffect(() => {
    const fetchGroups = async () => {
        try {
            const res = await fetch('/api/access_groups');
            if (!res.ok) throw new Error('Failed to fetch access groups');
            const data = await res.json();
            setAllGroups(data);
        } catch (err)
{
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
      router.push('/account');
    }
    return null; // Return null to prevent rendering before redirect
  }

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

    if (!title || !description || !startTime || !endTime) {
      setError('Please fill in all required fields.');
      return;
    }

    const payload = {
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      location,
      imageUrl,
      visibleToGroups: Array.from(selectedGroups),
      recurrence,
    };

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create event');
      }

      setSuccess('Event created successfully! Redirecting...');
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <header className={styles.header}>
        <h1>Create New Event</h1>
      </header>
      <div className={`${styles.container} ${styles.formContainerFullWidth}`}>
        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <p className={styles.error}>{error}</p>}
          {success && <p className={styles.success}>{success}</p>}

          <fieldset>
            <legend>Event Details</legend>
            <div className={styles.formGroup}>
              <label htmlFor="title">Event Title</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="start_time">Start Time</label>
              <input
                type="datetime-local"
                id="start_time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="end_time">End Time</label>
              <input
                type="datetime-local"
                id="end_time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </fieldset>

          <fieldset>
            <legend>Recurrence</legend>
            <div className={styles.formGroup}>
              <label>Recurrence</label>
              <div className={styles.checkboxWrapper}>
                <input
                  type="checkbox"
                  id="recurrence-enabled"
                  checked={recurrence.enabled}
                  onChange={(e) => setRecurrence(prev => ({ ...prev, enabled: e.target.checked }))}
                />
                <label htmlFor="recurrence-enabled">Make this a recurring event</label>
              </div>
            </div>
            {recurrence.enabled && (
              <>
                <div className={styles.formGroup}>
                  <label htmlFor="recurrence-frequency">Frequency</label>
                  <select
                    id="recurrence-frequency"
                    value={recurrence.frequency}
                    onChange={(e) => setRecurrence(prev => ({ ...prev, frequency: e.target.value }))}
                  >
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="recurrence-endDate">Repeat Until</label>
                  <input
                    type="date"
                    id="recurrence-endDate"
                    value={recurrence.endDate}
                    onChange={(e) => setRecurrence(prev => ({ ...prev, endDate: e.target.value }))}
                    required={recurrence.enabled}
                  />
                </div>
              </>
            )}
          </fieldset>

          <fieldset>
            <legend>Media</legend>
            <div className={styles.formGroup}>
              <label>Event Image (Optional)</label>
              <FileUploadInput
                onUploadSuccess={(url) => setImageUrl(url)}
                folder="events"
              />
              {imageUrl && (
                  <div className={styles.imagePreview}>
                      <p>Current image:</p>
                      <img src={imageUrl} alt="Event" style={{ maxWidth: '200px', marginTop: '10px' }} />
                  </div>
              )}
            </div>
          </fieldset>

          <fieldset>
            <legend>Visibility</legend>
            <div className={styles.formGroup}>
              <label>Visible To (optional)</label>
              <p className={styles.fieldDescription}>If no groups are selected, the event will be visible to everyone.</p>
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
          </fieldset>

          <button type="submit" className={styles.button}>Create Event</button>
        </form>

        <fieldset>
          <legend>Location</legend>
          <div className={styles.mapContainerFullWidth}>
            <div className={styles.formGroup}>
              <label>Location</label>
              {isLoaded && (
                <StandaloneSearchBox
                  onLoad={ref => setSearchBox(ref)}
                  onPlacesChanged={() => {
                    const places = searchBox.getPlaces();
                    const place = places[0];
                    if (place) {
                      setLocation(place.formatted_address);
                      setMarkerPosition({
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng(),
                      });
                    }
                  }}
                >
                  <input
                    type="text"
                    placeholder="Search for a location"
                    style={{
                      boxSizing: `border-box`,
                      border: `1px solid transparent`,
                      width: `100%`,
                      height: `40px`,
                      padding: `0 12px`,
                      borderRadius: `3px`,
                      boxShadow: `0 2px 6px rgba(0, 0, 0, 0.3)`,
                      fontSize: `14px`,
                      outline: `none`,
                      textOverflow: `ellipses`,
                      marginBottom: '10px',
                    }}
                  />
                </StandaloneSearchBox>
              )}
              {isLoaded && (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  zoom={12}
                  center={center}
                  onLoad={map => setMap(map)}
                  onClick={(e) => {
                    setMarkerPosition({
                      lat: e.latLng.lat(),
                      lng: e.latLng.lng(),
                    });
                    // You might want to do a reverse geocode here to get the address
                  }}
                >
                  {markerPosition && <Marker position={markerPosition} />}
                </GoogleMap>
              )}
              {loadError && <p>Error loading maps</p>}
            </div>
          </div>
        </fieldset>
      </div>
    </>
  );
}

export async function getStaticProps() {
    return {
        props: {
            title: 'Create Event',
        },
    };
}
