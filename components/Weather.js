import { useEffect, useState } from 'react';
import styles from '../styles/Weather.module.css';

const Weather = () => {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Latitude and Longitude for Mentone, Victoria, Australia
    const lat = -37.98;
    const lon = 145.06;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,soil_temperature_0cm`;

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch weather data.');
        }
        return response.json();
      })
      .then(data => {
        setWeather(data.current);
      })
      .catch(err => {
        console.error("Error fetching weather:", err);
        setError('Could not load weather.');
      });
  }, []);

  const getWeatherIcon = (code) => {
    // Weather codes from Open-Meteo documentation
    if ([0, 1].includes(code)) return '☀️'; // Clear sky, mainly clear
    if ([2].includes(code)) return '⛅️'; // Partly cloudy
    if ([3].includes(code)) return '☁️'; // Overcast
    if ([45, 48].includes(code)) return '🌫️'; // Fog
    if ([51, 53, 55, 56, 57].includes(code)) return '🌦️'; // Drizzle
    if ([61, 63, 65, 66, 67].includes(code)) return '🌧️'; // Rain
    if ([71, 73, 75, 77, 85, 86].includes(code)) return '🌨️'; // Snow
    if ([80, 81, 82].includes(code)) return '🌧️'; // Rain showers
    if ([95, 96, 99].includes(code)) return '⛈️'; // Thunderstorm
    return '🌡️'; // Default
  };

  if (error) {
    return <div className={styles.weatherWidget}><p>{error}</p></div>;
  }

  if (!weather) {
    return <div className={styles.weatherWidget}><p>Loading weather...</p></div>;
  }

  return (
    <div className={styles.weatherWidget}>
      <h4>Mentone Weather</h4>
      <div className={styles.weatherInfo}>
        <span className={styles.weatherIcon}>{getWeatherIcon(weather.weathercode)}</span>
        <span className={styles.weatherTemp}>{weather.temperature_2m}°C</span>
        <span className={styles.weatherTemp}>🌊 {weather.soil_temperature_0cm}°C</span>
      </div>
    </div>
  );
};

export default Weather;
