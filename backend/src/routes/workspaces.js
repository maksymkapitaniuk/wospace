const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const WORK_HOURS = 12;

async function getDynamicPrice(workspaceId, basePrice, targetDate) {
  const prev = new Date(targetDate);
  prev.setDate(prev.getDate() - 1);
  const prevStart = new Date(prev);
  prevStart.setHours(8, 0, 0, 0);
  const prevEnd = new Date(prev);
  prevEnd.setHours(20, 0, 0, 0);

  const bookings = await prisma.booking.findMany({
    where: {
      workspace_id: workspaceId,
      start_time: { lt: prevEnd },
      end_time: { gt: prevStart },
    },
    select: { start_time: true, end_time: true },
  });

  let occupiedHours = 0;
  for (const b of bookings) {
    const s = new Date(Math.max(b.start_time.getTime(), prevStart.getTime()));
    const e = new Date(Math.min(b.end_time.getTime(), prevEnd.getTime()));
    occupiedHours += Math.max(0, (e - s) / (1000 * 60 * 60));
  }

  const ratio = Math.min(occupiedHours / WORK_HOURS, 1);
  const multiplier = 0.75 + 0.5 * ratio;
  return Math.round(parseFloat(basePrice) * multiplier * 100) / 100;
}

router.get('/', async (req, res) => {
  try {
    const { category_id } = req.query;
    const where = { is_active: true };
    if (category_id) {
      where.category_id = parseInt(category_id);
    }

    const workspaces = await prisma.workspace.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    res.json(workspaces);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/pricing', async (req, res) => {
  try {
    const { date, category_id } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Параметр date обовʼязковий (YYYY-MM-DD)' });
    }

    const targetDate = new Date(`${date}T12:00:00`);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Невалідний формат дати' });
    }

    const where = { is_active: true };
    if (category_id) where.category_id = parseInt(category_id);

    const workspaces = await prisma.workspace.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    const result = await Promise.all(workspaces.map(async (w) => {
      const dynamic_price = await getDynamicPrice(w.workspace_id, w.base_price, targetDate);
      return { ...w, dynamic_price };
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.id);
    const workspace = await prisma.workspace.findUnique({
      where: { workspace_id: workspaceId },
      include: { category: true },
    });

    if (!workspace) {
      return res.status(404).json({ error: 'Робоче місце не знайдено' });
    }

    res.json(workspace);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/:id/availability', async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.id);
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Параметр date обовʼязковий (YYYY-MM-DD)' });
    }

    const dayStart = new Date(`${date}T00:00:00Z`);
    const dayEnd = new Date(`${date}T23:59:59Z`);

    const bookings = await prisma.booking.findMany({
      where: {
        workspace_id: workspaceId,
        start_time: { lt: dayEnd },
        end_time: { gt: dayStart },
      },
      select: { start_time: true, end_time: true },
      orderBy: { start_time: 'asc' },
    });

    res.json({ workspace_id: workspaceId, date, bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
module.exports.getDynamicPrice = getDynamicPrice;
