// ERROR HANDLING
// HttpError lets any code say "respond with this status and message".
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Express error middleware: turns thrown errors into clean JSON responses.
// Unknown errors become a generic 500 so internals are never leaked to the browser.
export function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Something went wrong. Please try again.' : err.message });
}

// Wraps async route handlers so rejected promises reach errorHandler (Express 4 doesn't do this itself).
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
