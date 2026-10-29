// =============================================================================
// API CLIENT
// The ONLY place the frontend talks to the backend. Components call these
// small functions instead of using fetch directly, so URLs, headers and error
// handling live in one spot. Works in server components and in the browser.
// =============================================================================

export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Core helper: sends the request and returns parsed JSON.
// If the backend answers with an error, we throw an Error whose message is shown to the user.
async function request(path, { revalidate, token, ...options } = {}) {
  const res = await fetch(`${API}${path}`, {
    // Seats change in real time, so most calls are never cached.
    // Slow-changing data (currencies, policies) passes `revalidate` seconds instead.
    ...(revalidate ? { next: { revalidate } } : { cache: 'no-store' }),
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 204) return {};
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.');
    err.status = res.status;
    throw err;
  }
  return data;
}

const post = (path, body, opts) => request(path, { method: 'POST', body: JSON.stringify(body), ...opts });
const q = encodeURIComponent;

export const api = {
  // --- Catalogue & availability ---
  getTours: (params = {}) => request(`/tours?${new URLSearchParams(params)}`),
  getTour: (slug) => request(`/tours/${q(slug)}`),
  getSlots: (slug, date) => request(`/availability?slug=${q(slug)}&date=${q(date)}`),
  getCalendar: (slug, month) => request(`/availability/calendar?slug=${q(slug)}&month=${q(month)}`),
  streamUrl: (slug) => `${API}/availability/stream?slug=${q(slug)}`, // EventSource URL (real-time)

  // --- Checkout ---
  getQuote: (data) => post('/quote', data),
  createBooking: (data) => post('/bookings', data),
  paymentConfig: () => request('/payments/config', { revalidate: 300 }),

  // --- Manage booking ---
  lookupBooking: (reference, email) => request(`/bookings/lookup?reference=${q(reference)}&email=${q(email)}`),
  getVoucher: (reference, email) => request(`/bookings/${q(reference)}/voucher?email=${q(email)}`),
  submitMomoProof: (reference, email, data) => post(`/bookings/${q(reference)}/momo-proof`, { email, ...data }),
  cancelBooking: (reference, email) => post(`/bookings/${q(reference)}/cancel`, { email }),
  rescheduleBooking: (reference, email, date, time) => post(`/bookings/${q(reference)}/reschedule`, { email, date, time }),

  // --- Content, leads & reference data ---
  getReviews: (slug) => request(`/reviews${slug ? `?slug=${q(slug)}` : ''}`),
  createReview: (data) => post('/reviews', data),
  sendMessage: (data) => post('/contact', data),
  subscribe: (email, source) => post('/newsletter', { email, source }),
  getCurrencies: () => request('/currencies', { revalidate: 3600 }),
  getPolicies: () => request('/policies', { revalidate: 300 }),
  track: (event) => post('/events', event, { keepalive: true }), // keepalive: survives page navigation

  // --- Admin (token required) ---
  admin: {
    overview: (token) => request('/admin/overview', { token }),
    bookings: (token, params = {}) => request(`/admin/bookings?${new URLSearchParams(params)}`, { token }),
    confirmPayment: (token, ref) => post(`/admin/bookings/${q(ref)}/confirm-payment`, {}, { token }),
    rejectPayment: (token, ref) => post(`/admin/bookings/${q(ref)}/reject-payment`, {}, { token }),
    checkin: (token, ref) => post(`/admin/bookings/${q(ref)}/checkin`, {}, { token }),
    guests: (token, search = '') => request(`/admin/guests?q=${q(search)}`, { token }),
    guest: (token, email) => request(`/admin/guests/${q(email)}`, { token }),
    addNote: (token, email, text) => post(`/admin/guests/${q(email)}/notes`, { text }, { token }),
    resources: (token) => request('/admin/resources', { token }),
    roster: (token, params = {}) => request(`/admin/roster?${new URLSearchParams(params)}`, { token }),
    assign: (token, id, data) => request(`/admin/roster/${q(id)}`, { method: 'PUT', body: JSON.stringify(data), token }),
    weatherCancel: (token, id) => post(`/admin/roster/${q(id)}/weather-cancel`, {}, { token }),
    // Tour catalogue editor
    tours: (token) => request('/admin/tours', { token }),
    createTour: (token, data) => post('/admin/tours', data, { token }),
    saveTour: (token, slug, data) => request(`/admin/tours/${q(slug)}`, { method: 'PUT', body: JSON.stringify(data), token }),
    uploadPhoto: (token, dataUrl) => post('/admin/uploads', { dataUrl }, { token }),
    searchPhotos: (token, query, page = 1) => request(`/admin/photos/search?q=${q(query)}&page=${page}`, { token }),
    trackPhoto: (token, downloadLocation) => post('/admin/photos/track', { downloadLocation }, { token }),
  },
};
