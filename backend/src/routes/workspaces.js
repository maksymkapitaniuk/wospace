const express = require('express');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

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
