const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/managers', authenticate(['admin']), async (req, res) => {
  try {
    const managers = await prisma.manager.findMany({
      select: { manager_id: true, full_name: true, email: true, phone: true },
    });
    res.json(managers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/managers', authenticate(['admin']), async (req, res) => {
  try {
    const { phone, email, name, surname, password, confirmPassword } = req.body;

    if (!phone || !email || !name || !surname || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Усі поля обовʼязкові' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Паролі не збігаються' });
    }

    const existing = await prisma.manager.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existing) {
      return res.status(409).json({ error: 'Менеджер з таким email або телефоном вже існує' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const manager = await prisma.manager.create({
      data: {
        full_name: `${name} ${surname}`,
        email,
        phone,
        password_hash,
      },
    });

    res.status(201).json({
      manager_id: manager.manager_id,
      full_name: manager.full_name,
      email: manager.email,
      phone: manager.phone,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.delete('/managers/:id', authenticate(['admin']), async (req, res) => {
  try {
    const managerId = parseInt(req.params.id);
    const manager = await prisma.manager.findUnique({ where: { manager_id: managerId } });
    if (!manager) {
      return res.status(404).json({ error: 'Менеджера не знайдено' });
    }
    await prisma.manager.delete({ where: { manager_id: managerId } });
    res.json({ message: 'Менеджера видалено' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/administrators', authenticate(['admin']), async (req, res) => {
  try {
    const admins = await prisma.administrator.findMany({
      select: { administrator_id: true, full_name: true, email: true, phone: true },
    });
    res.json(admins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/administrators', authenticate(['admin']), async (req, res) => {
  try {
    const { phone, email, name, surname, password, confirmPassword } = req.body;

    if (!phone || !email || !name || !surname || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Усі поля обовʼязкові' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Паролі не збігаються' });
    }

    const existing = await prisma.administrator.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (existing) {
      return res.status(409).json({ error: 'Адміністратор з таким email або телефоном вже існує' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const admin = await prisma.administrator.create({
      data: {
        full_name: `${name} ${surname}`,
        email,
        phone,
        password_hash,
      },
    });

    res.status(201).json({
      administrator_id: admin.administrator_id,
      full_name: admin.full_name,
      email: admin.email,
      phone: admin.phone,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.put('/workspaces/:id/price', authenticate(['admin']), async (req, res) => {
  try {
    const workspaceId = parseInt(req.params.id);
    const { base_price } = req.body;

    if (!base_price || base_price <= 0) {
      return res.status(400).json({ error: 'Ціна повинна бути більше 0' });
    }

    const workspace = await prisma.workspace.findUnique({ where: { workspace_id: workspaceId } });
    if (!workspace) {
      return res.status(404).json({ error: 'Робоче місце не знайдено' });
    }

    const updated = await prisma.workspace.update({
      where: { workspace_id: workspaceId },
      data: { base_price },
      include: { category: true },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.put('/services/:id/price', authenticate(['admin']), async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const { price } = req.body;

    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Ціна повинна бути більше 0' });
    }

    const service = await prisma.service.findUnique({ where: { service_id: serviceId } });
    if (!service) {
      return res.status(404).json({ error: 'Послугу не знайдено' });
    }

    const updated = await prisma.service.update({
      where: { service_id: serviceId },
      data: { price },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.put('/tariffs/:id/price', authenticate(['admin']), async (req, res) => {
  try {
    const tariffId = parseInt(req.params.id);
    const { price } = req.body;

    if (!price || price <= 0) {
      return res.status(400).json({ error: 'Ціна повинна бути більше 0' });
    }

    const tariff = await prisma.tariff.findUnique({ where: { tariff_id: tariffId } });
    if (!tariff) {
      return res.status(404).json({ error: 'Тариф не знайдено' });
    }

    const updated = await prisma.tariff.update({
      where: { tariff_id: tariffId },
      data: { price },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/tariffs', authenticate(['admin']), async (req, res) => {
  try {
    const tariffs = await prisma.tariff.findMany({ orderBy: { name: 'asc' } });
    res.json(tariffs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.patch('/tariffs/:id/toggle', authenticate(['admin']), async (req, res) => {
  try {
    const tariffId = parseInt(req.params.id);
    const tariff = await prisma.tariff.findUnique({ where: { tariff_id: tariffId } });
    if (!tariff) {
      return res.status(404).json({ error: 'Тариф не знайдено' });
    }

    const updated = await prisma.tariff.update({
      where: { tariff_id: tariffId },
      data: { is_enabled: !tariff.is_enabled },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
