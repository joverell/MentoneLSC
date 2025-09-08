const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const shouldLog = (level) => {
  const currentLogLevel = process.env.LOG_LEVEL || 'INFO';
  return LOG_LEVELS[level.toUpperCase()] >= LOG_LEVELS[currentLogLevel.toUpperCase()];
};

const log = (level, message, context = {}, additionalData = {}) => {
  if (!shouldLog(level)) {
    return;
  }

  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    context,
    ...additionalData,
  };

  const logMethod = console[level.toLowerCase()] || console.log;
  logMethod(`[${logEntry.level}]`, logEntry);
};

const logger = {
  debug: (message, context, data) => log('debug', message, context, data),
  info: (message, context, data) => log('info', message, context, data),
  warn: (message, context, data) => log('warn', message, context, data),
  error: (message, context, data) => {
    const errorData = data instanceof Error ? { error: { message: data.message, stack: data.stack } } : data;
    log('error', message, context, errorData);
  },
};

export default logger;
