const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../prismaClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authenticate(['client', 'admin']), async (req, res) => {
  try {
    const { id, role } = req.user;
    let user;
    if (role === 'client') {
      user = await prisma.client.findUnique({
        where: { client_id: id },
        select: { client_id: true, full_name: true, email: true, phone: true },
      });
    } else {
      user = await prisma.administrator.findUnique({
        where: { administrator_id: id },
        select: { administrator_id: true, full_name: true, email: true, phone: true },
      });
    }
    if (!user) return res.status(404).json({ error: 'Користувача не знайдено' });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.put('/profile', authenticate(['client', 'admin']), async (req, res) => {
  try {
    const { id, role } = req.user;
    const { full_name, email, phone } = req.body;

    if (!full_name || !email || !phone) {
      return res.status(400).json({ error: 'Усі поля обовʼязкові' });
    }

    if (role === 'client') {
      const duplicate = await prisma.client.findFirst({
        where: { OR: [{ email }, { phone }], NOT: { client_id: id } },
      });
      if (duplicate) return res.status(409).json({ error: 'Email або телефон вже використовується' });

      const user = await prisma.client.update({
        where: { client_id: id },
        data: { full_name, email, phone },
        select: { client_id: true, full_name: true, email: true, phone: true },
      });
      return res.json(user);
    }

    const duplicate = await prisma.administrator.findFirst({
      where: { OR: [{ email }, { phone }], NOT: { administrator_id: id } },
    });
    if (duplicate) return res.status(409).json({ error: 'Email або телефон вже використовується' });

    const user = await prisma.administrator.update({
      where: { administrator_id: id },
      data: { full_name, email, phone },
      select: { administrator_id: true, full_name: true, email: true, phone: true },
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.get('/', authenticate(['admin', 'manager']), async (req, res) => {
  try {
    const { search, page = '1', limit = '15', sort_by, sort_dir } = req.query;
    const take = Math.min(Math.max(parseInt(limit) || 15, 1), 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

    let where = {};
    if (search) {
      where = {
        OR: [
          { full_name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    let orderBy = { full_name: 'asc' };
    const dir = sort_dir === 'asc' ? 'asc' : sort_dir === 'desc' ? 'desc' : undefined;
    if (sort_by === 'full_name' && dir) {
      orderBy = { full_name: dir };
    } else if (sort_by === 'email' && dir) {
      orderBy = { email: dir };
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        select: { client_id: true, full_name: true, email: true, phone: true },
        orderBy,
        skip,
        take,
      }),
      prisma.client.count({ where }),
    ]);

    res.json({ data: clients, total, page: Math.max(parseInt(page) || 1, 1), limit: take });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.put('/:id', authenticate(['admin', 'manager']), async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const { full_name } = req.body;

    if (!full_name) {
      return res.status(400).json({ error: 'Імʼя обовʼязкове' });
    }

    const existing = await prisma.client.findUnique({ where: { client_id: clientId } });
    if (!existing) return res.status(404).json({ error: 'Користувача не знайдено' });

    const user = await prisma.client.update({
      where: { client_id: clientId },
      data: { full_name },
      select: { client_id: true, full_name: true, email: true, phone: true },
    });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.post('/', authenticate(['admin', 'manager']), async (req, res) => {
  try {
    const { name, surname, email, phone, password, confirmPassword } = req.body;

    if (!name || !surname || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ error: 'Усі поля обовʼязкові' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Паролі не збігаються' });
    }

    const duplicate = await prisma.client.findFirst({
      where: { OR: [{ email }, { phone }] },
    });
    if (duplicate) return res.status(409).json({ error: 'Користувач з таким email або телефоном вже існує' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.client.create({
      data: { full_name: `${name} ${surname}`, email, phone, password_hash },
      select: { client_id: true, full_name: true, email: true, phone: true },
    });

    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

router.delete('/:id', authenticate(['admin', 'manager']), async (req, res) => {
  try {
    const clientId = parseInt(req.params.id);
    const existing = await prisma.client.findUnique({ where: { client_id: clientId } });
    if (!existing) return res.status(404).json({ error: 'Користувача не знайдено' });

    await prisma.client.delete({ where: { client_id: clientId } });
    res.json({ message: 'Користувача видалено' });
  } catch (err) {
    console.error(err);
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Неможливо видалити: у користувача є бронювання або підписки' });
    }
    res.status(500).json({ error: 'Помилка сервера' });
  }
});

module.exports = router;
