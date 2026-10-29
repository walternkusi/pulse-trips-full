// =============================================================================
// ENTRY POINT: connects the database, starts the HTTP server and background jobs.
// =============================================================================
import { app } from './app.js';
import { config, isDemoPayments } from './config.js';
import { store } from './data/store.js';
import { dbEnabled, connectDb, closeDb } from './data/db.js';
import { publishAvailability } from './services/realtime.js';

// Connect to MongoDB BEFORE accepting requests. If it fails we stop instead of
// silently running in memory, because guests' bookings would then be lost.
try {
  await connectDb();
  await store.init();
} catch (err) {
  console.error(`❌ Could not connect to MongoDB: ${err.message}`);
  console.error('   Check MONGODB_URI in .env, the database user/password, and that your IP is allowed in Atlas -> Network Access.');
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log(`Pulse Trips API running on http://localhost:${config.port}`);
  if (dbEnabled) console.log(`🗄️  Database: MongoDB "${config.mongodbDb}" connected.`);
  else console.log('⚠️  No MONGODB_URI set: data is kept in memory and lost on restart.');
  if (isDemoPayments) console.log('⚠️  Demo payment mode: no STRIPE_SECRET_KEY / FLW_SECRET_KEY set, bookings confirm without charging.');
  if (!config.adminToken) console.log('ℹ️  Admin dashboard disabled: set ADMIN_TOKEN in .env to enable it.');
});

// Background job: every minute, release seats held by abandoned checkouts and
// tell any open tour pages that those seats are free again.
setInterval(() => {
  for (const b of store.expireHolds()) publishAvailability(b.slug, b.date, b.time);
}, 60000).unref();

// On Ctrl+C / redeploy: finish saving to the database, then exit.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    server.close();
    await Promise.race([closeDb(), new Promise((r) => setTimeout(r, 5000))]);
    process.exit(0);
  });
}
