const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/occupancy', authenticate(['manager']), async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        EXTRACT(HOUR FROM start_time) AS hour,
        COUNT(*)::int AS count
      FROM bookings
      WHERE start_time >= NOW() - INTERVAL '30 days'
      GROUP BY hour
      ORDER BY hour
    `;
    const data = Array.from({ length: 12 }, (_, i) => {
      const h = i + 8;
      const row = rows.find(r => Number(r.hour) === h);
      return { hour: `${h}:00`, count: row ? row.count : 0 };
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/occupancy-daily', authenticate(['manager']), async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        start_time::date AS day,
        COUNT(*)::int AS count
      FROM bookings
      WHERE start_time >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day
    `;
    const data = rows.map(r => ({
      day: new Date(r.day).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }),
      count: r.count,
    }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/workspaces', authenticate(['manager']), async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        w.name,
        COUNT(b.booking_id)::int AS bookings,
        COALESCE(SUM(b.total_price), 0)::float AS revenue
      FROM workspaces w
      LEFT JOIN bookings b ON b.workspace_id = w.workspace_id
        AND b.start_time >= NOW() - INTERVAL '30 days'
      GROUP BY w.workspace_id, w.name
      ORDER BY bookings DESC
    `;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/categories', authenticate(['manager']), async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        sc.name,
        COUNT(b.booking_id)::int AS bookings
      FROM space_categories sc
      LEFT JOIN workspaces w ON w.category_id = sc.category_id
      LEFT JOIN bookings b ON b.workspace_id = w.workspace_id
        AND b.start_time >= NOW() - INTERVAL '30 days'
      GROUP BY sc.category_id, sc.name
      ORDER BY bookings DESC
    `;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/services', authenticate(['manager']), async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        s.name,
        COUNT(bs.booking_id)::int AS usage_count,
        SUM(bs.quantity)::int AS total_quantity,
        COALESCE(SUM(bs.quantity * s.price), 0)::float AS revenue
      FROM services s
      LEFT JOIN booking_services bs ON bs.service_id = s.service_id
      LEFT JOIN bookings b ON b.booking_id = bs.booking_id
        AND b.start_time >= NOW() - INTERVAL '30 days'
      GROUP BY s.service_id, s.name
      ORDER BY usage_count DESC
    `;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/clients', authenticate(['manager']), async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        c.full_name,
        c.email,
        c.phone,
        COUNT(b.booking_id)::int AS bookings,
        COALESCE(SUM(b.total_price), 0)::float AS total_spent
      FROM clients c
      JOIN bookings b ON b.client_id = c.client_id
        AND b.start_time >= NOW() - INTERVAL '30 days'
      GROUP BY c.client_id, c.full_name, c.email, c.phone
      ORDER BY bookings DESC
      LIMIT 20
    `;
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/revenue', authenticate(['manager']), async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        start_time::date AS day,
        SUM(total_price)::float AS revenue
      FROM bookings
      WHERE start_time >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day
    `;
    const data = rows.map(r => ({
      day: new Date(r.day).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit' }),
      revenue: r.revenue,
    }));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/summary', authenticate(['manager']), async (req, res) => {
  try {
    const [stats] = await prisma.$queryRaw`
      SELECT
        (SELECT COUNT(*)::int FROM bookings WHERE start_time >= NOW() - INTERVAL '30 days') AS bookings_30d,
        (SELECT COUNT(*)::int FROM bookings WHERE start_time >= NOW() - INTERVAL '7 days') AS bookings_7d,
        (SELECT COALESCE(SUM(total_price), 0)::float FROM bookings WHERE start_time >= NOW() - INTERVAL '30 days') AS revenue_30d,
        (SELECT COUNT(DISTINCT client_id)::int FROM bookings WHERE start_time >= NOW() - INTERVAL '30 days') AS unique_clients_30d
    `;
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
