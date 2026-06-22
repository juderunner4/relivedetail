const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');

// DATA_DIR lets Railway persist the DB on a mounted volume (/data)
const dataDir = process.env.DATA_DIR || __dirname;
const db = new Database(path.join(dataDir, 'relive.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    make TEXT,
    model TEXT,
    year INTEGER,
    size TEXT CHECK(size IN ('sedan','suv','truck')),
    color TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    date TEXT NOT NULL,
    time TEXT,
    status TEXT DEFAULT 'Pending' CHECK(status IN ('Pending','Confirmed','Completed','Cancelled')),
    service_type TEXT,
    add_ons TEXT,
    total_price REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS booking_vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    line_items TEXT DEFAULT '[]',
    subtotal REAL DEFAULT 0,
    total REAL DEFAULT 0,
    status TEXT DEFAULT 'unpaid' CHECK(status IN ('paid','unpaid')),
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS maintenance_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    plan_tier TEXT CHECK(plan_tier IN ('Essential','Classic','Signature')),
    frequency_weeks INTEGER,
    price_per_visit REAL,
    start_date TEXT,
    last_service_date TEXT,
    next_service_date TEXT,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS revenue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    amount REAL,
    date TEXT,
    service_type TEXT,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    description TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mileage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    date TEXT NOT NULL,
    miles REAL NOT NULL DEFAULT 0,
    from_address TEXT,
    to_address TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    position INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ad_spend (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0,
    date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS job_checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    item TEXT NOT NULL,
    checked INTEGER DEFAULT 0
  );
`);

// Safe migrations for columns added after initial deploy
try { db.exec("ALTER TABLE bookings ADD COLUMN heard_about TEXT"); } catch(e) {}

function seed() {
  const existing = db.prepare('SELECT id FROM clients WHERE name = ?').get('Roger Martin');
  if (existing) return;

  const passwordHash = bcrypt.hashSync(process.env.OWNER_PASSWORD || 'relive2024', 10);

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  insertSetting.run('owner_password_hash', passwordHash);
  insertSetting.run('business_name', 'Relive Mobile Detailing');
  insertSetting.run('business_phone', '(562) 292-1545');
  insertSetting.run('business_email', 'juderunner4@gmail.com');
  insertSetting.run('business_address', 'Lynchburg, Virginia');
  insertSetting.run('owner_email', 'juderunner4@gmail.com');
  insertSetting.run('notification_email', 'juderunner4@gmail.com');
  insertSetting.run('monthly_revenue_goal', '2000');
  insertSetting.run('monthly_job_goal', '15');
  insertSetting.run('quick_links', JSON.stringify([
    { label: 'Instagram', url: 'https://instagram.com' },
    { label: 'Facebook', url: 'https://facebook.com' },
    { label: 'Google Business', url: 'https://business.google.com' },
    { label: 'Website', url: 'https://relivedetail.com' },
    { label: 'Google Voice', url: 'https://voice.google.com' },
    { label: 'Venmo', url: 'https://venmo.com/u/judetenorio' }
  ]));
  insertSetting.run('pricing', JSON.stringify({
    exterior_sedan: 70, exterior_suv: 87,
    interior_sedan: 100, interior_suv: 125,
    full_detail_sedan: 150, full_detail_suv: 185,
    addon_clay_bar: 35, addon_spray_wax: 30, addon_engine_bay: 62,
    plan_essential: 110, plan_classic: 140, plan_signature: 160
  }));

  const clientId = db.prepare(
    'INSERT INTO clients (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(
    'Roger Martin',
    '(434) 818-3278',
    '',
    '225 Peach Tree Ln, Lynchburg, VA 24504',
    "Older couple (70s). Wife has OCD — always rinse driveway after job. Very friendly and formal — address as Mr. Martin."
  ).lastInsertRowid;

  const mazdaId = db.prepare(
    'INSERT INTO vehicles (client_id, make, model, year, size, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(clientId, 'Mazda', 'SUV', null, 'suv', "Wife's car — anniversary gift").lastInsertRowid;

  const taurusId = db.prepare(
    'INSERT INTO vehicles (client_id, make, model, year, size) VALUES (?, ?, ?, ?, ?)'
  ).run(clientId, 'Ford', 'Taurus SHO', null, 'sedan').lastInsertRowid;

  const bookingId = db.prepare(
    `INSERT INTO bookings (client_id, date, time, status, service_type, add_ons, total_price, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    clientId,
    '2026-05-19',
    '15:30',
    'Confirmed',
    'Full Interior & Exterior Detail',
    JSON.stringify(['Ceramic Wax']),
    300,
    'Arrive around 3:30 PM. Water and power available on paved driveway. Anniversary bundle discount. Split across Tuesday (Mazda) and Wednesday (Taurus) if needed.'
  ).lastInsertRowid;

  db.prepare('INSERT INTO booking_vehicles (booking_id, vehicle_id) VALUES (?, ?)').run(bookingId, mazdaId);
  db.prepare('INSERT INTO booking_vehicles (booking_id, vehicle_id) VALUES (?, ?)').run(bookingId, taurusId);

  db.prepare(
    'INSERT INTO revenue (booking_id, amount, date, service_type, notes) VALUES (?, ?, ?, ?, ?)'
  ).run(bookingId, 300, '2026-05-19', 'Full Interior & Exterior Detail', 'Roger Martin — anniversary bundle');

  console.log('Seed data inserted: Roger Martin + booking');
}

seed();

module.exports = db;
