import React from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const CalendarComponent = ({ onDateChange }) => {
  return (
    <div className="calendar-container">
      <Calendar onChange={onDateChange} />
    </div>
  );
};

export default CalendarComponent;
