# Pulse Trips Frontend (Next.js)

Talks to the backend ONLY through `lib/api.js`.

    npm install
    cp .env.example .env.local
    npm run dev          # http://localhost:3000  (start ../backend first)

- `app/` pages · `components/` reusable UI · `lib/api.js` all backend calls
- Server components (home, tour, reviews) load data on the server for speed and SEO.
- Client components (booking panel, contact, my bookings) handle forms.
