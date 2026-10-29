// =============================================================================
// TOUR CATALOGUE
// Everything a tour page needs lives here: pricing tiers, departure times,
// itinerary, inclusions, media and route stops.
//
// ✏️  EDIT THIS FILE to change your products. Prices are SAMPLE values in USD
//     (the base currency); the site converts them for display and checkout.
// 📷  Photos are from Unsplash (free licence). Replace them with your own.
// =============================================================================

// Small helper so every image uses the same size/quality settings from the Unsplash CDN.
const img = (id, alt) => ({ src: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=75`, alt });

export const tours = [
  // ---------------------------------------------------------------------------
  {
    slug: 'serengeti-great-migration-safari',
    category: 'safari',                    // used by the filters on the tours page
    country: 'Tanzania',
    name: 'Serengeti Great Migration Safari',
    blurb: 'Three days in a pop-up-roof 4x4 following the herds across the Serengeti and into Ngorongoro Crater.',
    durationHours: 72,                     // used for roster scheduling (blocks guide/vehicle)
    durationLabel: '3 days',
    maxGuests: 6,                          // seats per departure (one safari vehicle)
    minAge: 6,
    level: 'Easy',
    languages: ['English', 'French', 'Swahili'],
    // Days the tour runs: 0 = Sunday ... 6 = Saturday.
    daysOfWeek: [1, 3, 5],
    departures: ['07:00'],                 // start time(s) on each operating day
    cutoffHours: 24,                       // stop selling this many hours before departure
    // --- Pricing (USD) -------------------------------------------------------
    pricing: {
      adult: 1290,
      child: 890,                          // ages 6-11
      privateFlat: 6900,                   // whole vehicle, any group up to maxGuests
      group: { minGuests: 4, discount: 0.08 }, // 8% off when 4+ guests share a booking
      seasons: [
        { name: 'Peak migration season', months: [7, 8, 9], multiplier: 1.15 },
        { name: 'Green season', months: [4, 5], multiplier: 0.85 },
      ],
    },
    addonIds: ['transfer', 'balloon', 'insurance'],
    // --- Content ---------------------------------------------------------------
    images: [
      img('1516426122078-c23e76319801', 'Safari vehicle watching the sunset over the Serengeti'),
      img('1516026672322-bc52d61a55d5', 'Lone acacia tree under a dramatic Serengeti sky'),
      img('1504173010664-32509aeebb62', 'Two lionesses resting in the grass'),
    ],
    video: '',                             // optional MP4 URL for a looping preview
    highlights: ['Great Migration river crossings (Jul–Oct)', 'Big Five game drives', 'Ngorongoro Crater floor', 'Expert naturalist guide'],
    inclusions: ['Park & conservation fees', 'Pop-up-roof 4x4 with fridge and charging', '2 nights in a tented lodge', 'All meals and bottled water', 'Binoculars'],
    exclusions: ['International flights', 'Visa fees', 'Tips for guide (optional)', 'Alcoholic drinks'],
    whatToBring: ['Passport', 'Neutral-coloured clothing', 'Warm layer for early mornings', 'Sunscreen & hat', 'Camera with zoom lens'],
    meetingPoint: { name: 'Arusha Clock Tower', lat: -3.3700, lng: 36.6833, note: 'Free hotel pickup in Arusha town from 06:30.' },
    itinerary: [
      { time: 'Day 1', title: 'Arusha → Central Serengeti', text: 'Scenic drive through the Great Rift Valley escarpment, afternoon game drive in Seronera.' },
      { time: 'Day 2', title: 'Full day with the herds', text: 'Follow the wildebeest with a packed lunch; your guide tracks big-cat sightings over the radio network.' },
      { time: 'Day 3', title: 'Ngorongoro Crater → Arusha', text: 'Descend 600 m to the crater floor for rhino, lion and flamingo, then return to Arusha by 18:00.' },
    ],
    stops: [
      { name: 'Arusha (start)', lat: -3.3700, lng: 36.6833 },
      { name: 'Seronera, Central Serengeti', lat: -2.4500, lng: 34.8233 },
      { name: 'Ngorongoro Crater rim', lat: -3.2400, lng: 35.4875 },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'kilimanjaro-machame-trek',
    category: 'adventure',
    country: 'Tanzania',
    name: 'Kilimanjaro Machame Route Trek',
    blurb: 'Seven days on the "Whiskey" route to Uhuru Peak (5,895 m) with certified mountain guides and a 3:1 crew ratio.',
    durationHours: 168,
    durationLabel: '7 days',
    maxGuests: 10,
    minAge: 12,
    level: 'Challenging',
    languages: ['English', 'Swahili'],
    daysOfWeek: [0],                       // weekly Sunday departures
    departures: ['08:00'],
    cutoffHours: 72,
    pricing: {
      adult: 2450,
      child: 2450,                         // same price: minimum age 12
      privateFlat: 21000,
      group: { minGuests: 4, discount: 0.05 },
      seasons: [{ name: 'Dry season', months: [1, 2, 8, 9], multiplier: 1.1 }],
    },
    addonIds: ['transfer', 'gear', 'insurance'],
    images: [
      img('1489392191049-fc10c97e64b6', 'Snow-capped Mount Kilimanjaro above the clouds'),
      img('1621414050946-1b936a78491f', 'Group of trekkers climbing a rocky Kilimanjaro trail'),
    ],
    video: '',
    highlights: ['92% summit success rate on our 7-day itinerary', 'Daily health checks with pulse oximeter', 'Fair-wage porter crew (KPAP partner)', 'Summit certificate'],
    inclusions: ['Park, camping & rescue fees', 'Mountain guides, cook and porters', 'Four-season tents and sleeping mats', 'All meals on the mountain', 'Emergency oxygen'],
    exclusions: ['Sleeping bag (rentable as add-on)', 'Tips for crew', 'Travel insurance (strongly recommended)'],
    whatToBring: ['Broken-in hiking boots', 'Thermal layers & down jacket', 'Head torch', 'Trekking poles', '3 litres of water capacity'],
    meetingPoint: { name: 'Moshi town centre', lat: -3.3348, lng: 37.3404, note: 'Gear check and briefing the evening before departure at your hotel.' },
    itinerary: [
      { time: 'Day 1', title: 'Machame Gate → Machame Camp', text: 'Rainforest walk, 5–7 hours, 1,800 m → 3,000 m.' },
      { time: 'Day 2–3', title: 'Shira Plateau & Lava Tower', text: 'Climb high, sleep low: the key to acclimatisation.' },
      { time: 'Day 4–5', title: 'Barranco Wall → Barafu Camp', text: 'The famous scramble, then rest before the summit push.' },
      { time: 'Day 6', title: 'Summit night', text: 'Start at midnight, reach Uhuru Peak at sunrise, descend to Mweka Camp.' },
      { time: 'Day 7', title: 'Mweka Gate', text: 'Final descent, certificate ceremony and transfer back to Moshi.' },
    ],
    stops: [
      { name: 'Moshi (start)', lat: -3.3348, lng: 37.3404 },
      { name: 'Machame Gate', lat: -3.1700, lng: 37.2400 },
      { name: 'Uhuru Peak', lat: -3.0758, lng: 37.3533 },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'amboseli-elephants-overnight',
    category: 'safari',
    country: 'Kenya',
    name: 'Amboseli Elephants & Kilimanjaro Views',
    blurb: 'Overnight safari from Nairobi to the land of giant tuskers, framed by Kilimanjaro at sunrise.',
    durationHours: 36,
    durationLabel: '2 days',
    maxGuests: 7,
    minAge: 4,
    level: 'Easy',
    languages: ['English', 'Swahili'],
    daysOfWeek: [2, 4, 6],
    departures: ['06:00'],
    cutoffHours: 24,
    pricing: {
      adult: 640,
      child: 420,
      privateFlat: 3600,
      group: { minGuests: 4, discount: 0.1 },
      seasons: [{ name: 'Festive season', months: [12], multiplier: 1.2 }],
    },
    addonIds: ['transfer', 'insurance'],
    images: [
      img('1535941339077-2dd1c7963098', 'Large elephant walking across golden grassland'),
      img('1547471080-7cc2caa01a7e', 'Acacia tree silhouetted against an orange Kenyan sunset'),
      img('1549366021-9f761d450615', 'Elephant emerging from green bush'),
    ],
    video: '',
    highlights: ['Some of Africa’s largest elephant herds', 'Sunrise views of Kilimanjaro', 'Maasai village visit', 'Observation Hill sundowner'],
    inclusions: ['Park fees', 'Safari minivan with pop-up roof', '1 night lodge with pool', 'All meals', 'Drinking water'],
    exclusions: ['Maasai village entry (USD 20, paid locally)', 'Tips', 'Drinks at lodge'],
    whatToBring: ['Passport', 'Light jacket', 'Sunglasses', 'Camera'],
    meetingPoint: { name: 'Nairobi CBD (Kenyatta Avenue)', lat: -1.2864, lng: 36.8172, note: 'Pickup from Nairobi hotels and Airbnbs from 05:30.' },
    itinerary: [
      { time: '06:00', title: 'Depart Nairobi', text: '4-hour drive south with a coffee stop at Emali.' },
      { time: '12:00', title: 'Lodge check-in & lunch', text: 'Rest by the pool during the midday heat.' },
      { time: '15:30', title: 'Afternoon game drive', text: 'Swamps, elephants and a sundowner on Observation Hill.' },
      { time: 'Day 2', title: 'Sunrise drive & return', text: 'Kilimanjaro is clearest at dawn. Back in Nairobi by 18:00.' },
    ],
    stops: [
      { name: 'Nairobi (start)', lat: -1.2864, lng: 36.8172 },
      { name: 'Observation Hill, Amboseli', lat: -2.6400, lng: 37.2500 },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'nairobi-giraffes-and-national-park',
    category: 'day-trip',
    country: 'Kenya',
    name: 'Nairobi Giraffes & National Park Half-Day',
    blurb: 'Hand-feed endangered Rothschild giraffes, then spot rhino and lion with the city skyline behind them.',
    durationHours: 5,
    durationLabel: '5 hours',
    maxGuests: 12,
    minAge: 0,
    level: 'Easy',
    languages: ['English', 'French'],
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],     // daily
    departures: ['06:30', '13:00'],        // morning and afternoon slots
    cutoffHours: 6,
    pricing: {
      adult: 145,
      child: 75,
      privateFlat: 690,
      group: { minGuests: 6, discount: 0.1 },
      seasons: [],
    },
    addonIds: ['transfer', 'meal'],
    images: [
      img('1523805009345-7448845a9e53', 'Giraffe silhouetted at sunrise beside an acacia'),
      img('1575550959106-5a7defe28b56', 'Male lion resting with a cub'),
    ],
    video: '',
    highlights: ['Feed giraffes at the Giraffe Centre', 'Only national park next to a capital city', 'Perfect for layovers', 'Family friendly'],
    inclusions: ['Giraffe Centre entry', 'National park fees', 'Pop-up-roof safari vehicle', 'Bottled water'],
    exclusions: ['Lunch (add-on available)', 'Tips'],
    whatToBring: ['Passport (needed at park gate)', 'Light jacket for morning drives', 'Camera'],
    meetingPoint: { name: 'Nairobi National Park Main Gate', lat: -1.3133, lng: 36.8297, note: 'Or choose the hotel-transfer add-on.' },
    itinerary: [
      { time: 'Start', title: 'Game drive', text: 'Two and a half hours tracking rhino, lion, buffalo and giraffe.' },
      { time: '+3 h', title: 'Giraffe Centre', text: 'Feed and photograph the giraffes from the raised platform.' },
      { time: '+5 h', title: 'Drop-off', text: 'Back at your hotel or the airport.' },
    ],
    stops: [
      { name: 'National Park Main Gate', lat: -1.3133, lng: 36.8297 },
      { name: 'Giraffe Centre, Karen', lat: -1.3755, lng: 36.7444 },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'cape-peninsula-full-day',
    category: 'day-trip',
    country: 'South Africa',
    name: 'Cape Peninsula & Penguins Full Day',
    blurb: 'Chapman’s Peak, the Cape of Good Hope and the Boulders Beach penguin colony in one unforgettable loop.',
    durationHours: 9,
    durationLabel: '9 hours',
    maxGuests: 14,
    minAge: 0,
    level: 'Moderate',
    languages: ['English', 'French'],
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    departures: ['08:00'],
    cutoffHours: 12,
    pricing: {
      adult: 120,
      child: 70,
      privateFlat: 980,
      group: { minGuests: 6, discount: 0.1 },
      seasons: [{ name: 'Summer high season', months: [12, 1, 2], multiplier: 1.12 }],
    },
    addonIds: ['transfer', 'meal', 'gear'],
    images: [
      img('1580060839134-75a5edca2e99', 'Aerial view of Cape Town, Table Mountain and the stadium'),
    ],
    video: '',
    highlights: ['Chapman’s Peak Drive', 'African penguins at Boulders Beach', 'Cape Point lighthouse hike', 'Optional cycling section'],
    inclusions: ['Table Mountain National Park fees', 'Boulders Beach entry', 'Air-conditioned minibus', 'Professional guide'],
    exclusions: ['Lunch (seafood add-on available)', 'Funicular ticket at Cape Point', 'Tips'],
    whatToBring: ['Windbreaker', 'Comfortable walking shoes', 'Sunscreen', 'Swimwear (summer)'],
    meetingPoint: { name: 'V&A Waterfront Clock Tower', lat: -33.9036, lng: 18.4205, note: 'Free pickup from City Bowl and Atlantic Seaboard hotels.' },
    itinerary: [
      { time: '08:00', title: 'Chapman’s Peak', text: 'Photo stops along one of the world’s great coastal roads.' },
      { time: '10:30', title: 'Cape of Good Hope', text: 'Short hike to the old lighthouse at Cape Point.' },
      { time: '13:00', title: 'Lunch in Simon’s Town', text: 'Harbour-side seafood (add-on) or free time.' },
      { time: '14:30', title: 'Boulders Beach', text: 'Boardwalk among 3,000 African penguins.' },
      { time: '17:00', title: 'Return to Cape Town', text: 'Via the False Bay coast and Muizenberg’s colourful huts.' },
    ],
    stops: [
      { name: 'V&A Waterfront (start)', lat: -33.9036, lng: 18.4205 },
      { name: 'Chapman’s Peak Drive', lat: -34.0880, lng: 18.3580 },
      { name: 'Cape Point', lat: -34.3568, lng: 18.4970 },
      { name: 'Boulders Beach', lat: -34.1975, lng: 18.4510 },
    ],
  },

  // ---------------------------------------------------------------------------
  {
    slug: 'pulse-afrobeats-night-nairobi',
    category: 'event',
    country: 'Kenya',
    name: 'Pulse Afrobeats Night — Nairobi',
    blurb: 'Our signature open-air night of Afrobeats, Amapiano and Bongo Flava with VIP transport there and back.',
    durationHours: 7,
    durationLabel: '7 hours',
    maxGuests: 40,                         // event tickets per night
    minAge: 18,
    level: 'Easy',
    languages: ['English', 'Swahili'],
    daysOfWeek: [5, 6],                    // Fridays and Saturdays
    departures: ['19:00'],
    cutoffHours: 2,
    pricing: {
      adult: 65,
      child: 65,                           // 18+ event: no child rate
      privateFlat: 1800,                   // private VIP table for your group
      group: { minGuests: 5, discount: 0.15 },
      seasons: [{ name: 'Festive season', months: [12], multiplier: 1.25 }],
    },
    addonIds: ['transfer', 'meal'],
    images: [
      img('1470229722913-7c0e2dbbafd3', 'Crowd in front of a glowing festival stage'),
      img('1501281668745-f7f57925c3b4', 'Fan filming the stage on a phone at a concert'),
    ],
    video: '',
    highlights: ['Live DJs and headline act', 'Skip-the-line entry', 'Safe round-trip transport', 'Welcome drink'],
    inclusions: ['Entry ticket', 'Welcome drink', 'Return shuttle from Westlands'],
    exclusions: ['Food and further drinks', 'Hotel pickup (add-on)'],
    whatToBring: ['Photo ID (18+)', 'Mobile money or card for the bar'],
    meetingPoint: { name: 'Westlands shuttle stop', lat: -1.2676, lng: 36.8108, note: 'Exact venue is shared in your voucher 48 hours before the event.' },
    itinerary: [
      { time: '19:00', title: 'Shuttle departs Westlands', text: 'Meet the crew and grab your wristband.' },
      { time: '20:00', title: 'Doors & welcome drink', text: 'Warm-up DJ sets.' },
      { time: '23:00', title: 'Headline act', text: 'Announced on our socials each week.' },
      { time: '02:00', title: 'Return shuttles', text: 'Drop-offs in Westlands, Kilimani and the CBD.' },
    ],
    stops: [
      { name: 'Westlands shuttle stop', lat: -1.2676, lng: 36.8108 },
    ],
  },
];

// -----------------------------------------------------------------------------
// DESTINATIONS shown in the website's "Where to?" and country filters, even
// before a country has tours (visitors are then invited to plan a custom trip).
// Countries that have published tours are added automatically.
// ✏️ Must be countries listed in services/availability.js (UTC_OFFSET_HOURS).
// -----------------------------------------------------------------------------
export const destinations = ['Kenya', 'Tanzania', 'Rwanda', 'South Africa'];

// -----------------------------------------------------------------------------
// ADD-ONS
// `per: 'person'` multiplies by guest count; `per: 'booking'` is charged once.
// -----------------------------------------------------------------------------
export const addons = [
  { id: 'transfer', label: 'Hotel pickup & drop-off', price: 25, per: 'booking' },
  { id: 'meal', label: 'Lunch / meal upgrade', price: 18, per: 'person' },
  { id: 'gear', label: 'Equipment rental (bike, sleeping bag or poles)', price: 30, per: 'person' },
  { id: 'balloon', label: 'Sunrise hot-air balloon flight', price: 560, per: 'person' },
  { id: 'insurance', label: 'Trip protection insurance', price: 35, per: 'person' },
];

// -----------------------------------------------------------------------------
// PROMO CODES
// WELCOME10 is handed out by the newsletter pop-up (lead capture).
// -----------------------------------------------------------------------------
export const promoCodes = {
  WELCOME10: { percent: 10, label: 'Newsletter welcome discount' },
  GROUPVIBES: { percent: 5, label: 'Group promo' },
};

// -----------------------------------------------------------------------------
// OPERATIONS RESOURCES (roster)
// Guides, drivers and vehicles that can be assigned to departures.
// -----------------------------------------------------------------------------
export const resources = {
  guides: [
    { id: 'g-amani', name: 'Amani K.', languages: ['English', 'Swahili'], phone: '' },
    { id: 'g-claire', name: 'Claire M.', languages: ['English', 'French'], phone: '' },
    { id: 'g-joseph', name: 'Joseph N.', languages: ['English', 'Swahili', 'French'], phone: '' },
    { id: 'g-thandi', name: 'Thandi D.', languages: ['English'], phone: '' },
  ],
  drivers: [
    { id: 'd-peter', name: 'Peter O.', phone: '' },
    { id: 'd-grace', name: 'Grace W.', phone: '' },
    { id: 'd-sipho', name: 'Sipho M.', phone: '' },
  ],
  vehicles: [
    { id: 'v-lc1', name: 'Land Cruiser #1', seats: 6 },
    { id: 'v-lc2', name: 'Land Cruiser #2', seats: 7 },
    { id: 'v-bus1', name: 'Minibus 14-seater', seats: 14 },
    { id: 'v-coach', name: 'Event coach', seats: 40 },
  ],
};
