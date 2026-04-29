const { Pool } = require('pg');
const fs = require('fs');
const csv = require('csv-parser');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '1234',
  database: 'coworking_db',
});

function readCSV(path) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(path)
      .pipe(csv())
      .on('data', (r) => rows.push(r))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

function cleanPhone(raw) {
  return raw.split('x')[0].replace(/[^0-9+]/g, '').slice(0, 20);
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  const client = await pool.connect();

  try {
    console.log('Reading CSV...');
    const csvRows = await readCSV('./customers-1000.csv');

    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash('1111', 10);

    await client.query('BEGIN');

    console.log('Inserting 1000 clients...');
    const clientIds = [];
    for (const row of csvRows) {
      const fullName = `${row['First Name']} ${row['Last Name']}`;
      const email = row['Email'];
      const phone = cleanPhone(row['Phone 1']);
      const res = await client.query(
        'INSERT INTO clients (full_name, email, phone, password_hash) VALUES ($1, $2, $3, $4) RETURNING client_id',
        [fullName, email, phone, passwordHash]
      );
      clientIds.push(res.rows[0].client_id);
    }
    console.log(`Inserted ${clientIds.length} clients`);

    const { rows: workspaces } = await client.query('SELECT workspace_id, base_price FROM workspaces WHERE is_active = true ORDER BY workspace_id');
    const { rows: services } = await client.query('SELECT service_id, price FROM services ORDER BY service_id');
    console.log(`Workspaces: ${workspaces.length}, Services: ${services.length}`);

    const startDate = new Date(2025, 0, 1);
    const endDate = new Date(2026, 5, 1);
    const bookings = [];
    const bookingServices = [];

    console.log('Generating bookings...');
    const currentDate = new Date(startDate);
    while (currentDate < endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      for (const ws of workspaces) {
        let hour = 8;
        while (hour < 19) {
          if (Math.random() < 0.6) {
            const maxDuration = Math.min(4, 19 - hour);
            if (maxDuration < 1) break;
            const duration = randInt(1, maxDuration);
            const endHour = hour + duration;

            const bookingIdx = bookings.length;
            const clientId = randItem(clientIds);
            const totalPrice = parseFloat(ws.base_price) * duration;

            bookings.push({
              client_id: clientId,
              workspace_id: ws.workspace_id,
              start_time: `${dateStr}T${String(hour).padStart(2, '0')}:00:00`,
              end_time: `${dateStr}T${String(endHour).padStart(2, '0')}:00:00`,
              total_price: totalPrice,
            });

            if (services.length > 0 && Math.random() < 0.3) {
              const numServices = randInt(1, Math.min(3, services.length));
              const shuffled = [...services].sort(() => Math.random() - 0.5);
              for (let si = 0; si < numServices; si++) {
                const svc = shuffled[si];
                const qty = randInt(1, 3);
                bookingServices.push({ bookingIdx, service_id: svc.service_id, quantity: qty });
                bookings[bookingIdx].total_price += parseFloat(svc.price) * qty;
              }
            }

            hour = endHour;
          } else {
            hour += 1;
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
    console.log(`Generated ${bookings.length} bookings, ${bookingServices.length} booking_services`);

    console.log('Inserting bookings...');
    const bookingIdMap = [];
    const BATCH = 500;
    for (let i = 0; i < bookings.length; i += BATCH) {
      const batch = bookings.slice(i, i + BATCH);
      const values = [];
      const params = [];
      batch.forEach((b, j) => {
        const off = j * 5;
        values.push(`($${off + 1}, $${off + 2}, $${off + 3}, $${off + 4}, $${off + 5})`);
        params.push(b.client_id, b.workspace_id, b.start_time, b.end_time, b.total_price);
      });
      const res = await client.query(
        `INSERT INTO bookings (client_id, workspace_id, start_time, end_time, total_price) VALUES ${values.join(',')} RETURNING booking_id`,
        params
      );
      res.rows.forEach((r) => bookingIdMap.push(r.booking_id));

      if ((i / BATCH) % 20 === 0) {
        process.stdout.write(`  ${i + batch.length}/${bookings.length}\r`);
      }
    }
    console.log(`\nInserted ${bookingIdMap.length} bookings`);

    if (bookingServices.length > 0) {
      console.log('Inserting booking_services...');
      for (let i = 0; i < bookingServices.length; i += BATCH) {
        const batch = bookingServices.slice(i, i + BATCH);
        const values = [];
        const params = [];
        batch.forEach((bs, j) => {
          const off = j * 3;
          values.push(`($${off + 1}, $${off + 2}, $${off + 3})`);
          params.push(bookingIdMap[bs.bookingIdx], bs.service_id, bs.quantity);
        });
        await client.query(
          `INSERT INTO booking_services (booking_id, service_id, quantity) VALUES ${values.join(',')}`,
          params
        );
      }
      console.log(`Inserted ${bookingServices.length} booking_services`);
    }

    await client.query('COMMIT');
    console.log('Seed completed!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
