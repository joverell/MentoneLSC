const log = (level, message, data) => {
  const timestamp = new Date().toISOString();
  console.log(JSON.stringify({
    timestamp,
    level,
    message,
    ...data
  }));
};

const logger = {
  info: (message, data = {}) => log('info', message, data),
  error: (message, data = {}) => log('error', message, data),
  warn: (message, data = {}) => log('warn', message, data),
  debug: (message, data = {}) => log('debug', message, data),
};

export default logger;
