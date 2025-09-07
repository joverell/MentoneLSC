import { getAuth } from "firebase/auth";

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Determines if a message should be logged based on the current log level.
const shouldLog = (level) => {
  const currentLogLevel = process.env.NEXT_PUBLIC_LOG_LEVEL || 'INFO';
  return LOG_LEVELS[level.toUpperCase()] >= LOG_LEVELS[currentLogLevel.toUpperCase()];
};

// The core logging function.
const log = (level, message, context = {}, additionalData = {}) => {
  if (!shouldLog(level)) {
    return;
  }

  const auth = getAuth();
  const user = auth.currentUser;

  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    context, // e.g., { component: 'DocumentList', function: 'handleDelete' }
    user: user ? { uid: user.uid, email: user.email } : { uid: 'anonymous' },
    ...additionalData,
  };

  // In a real app, you might send this to a logging service (e.g., Sentry, LogRocket, Datadog).
  // For this example, we'll just use console.log, but format it nicely.
  const logMethod = console[level.toLowerCase()] || console.log;
  logMethod(`[${logEntry.level}]`, logEntry);
};

// The logger object that will be used throughout the application.
const logger = {
  debug: (message, context, data) => log('debug', message, context, data),
  info: (message, context, data) => log('info', message, context, data),
  warn: (message, context, data) => log('warn', message, context, data),
  error: (message, context, data) => {
    // Include stack trace for errors if available
    const errorData = data instanceof Error ? { error: { message: data.message, stack: data.stack } } : data;
    log('error', message, context, errorData);
  },
};

export default logger;
