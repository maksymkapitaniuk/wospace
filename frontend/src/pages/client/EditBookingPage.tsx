import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import type { Booking, Workspace, Service } from '../../types';

interface PricedWorkspace extends Workspace {
  dynamic_price: number;
}

export default function EditBookingPage() {
  const { id } = useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [workspaces, setWorkspaces] = useState<PricedWorkspace[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({ workspace_id: '', date: '', start_time: '', end_time: '' });
  const [selectedServices, setSelectedServices] = useState<{ service_id: number; quantity: number }[]>([]);
  const [error, setError] = useState('');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [initialDate, setInitialDate] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get(`/bookings/${id}`),
      api.get('/services'),
    ]).then(([bk, sv]) => {
      const b = bk.data as Booking;
      setBooking(b);
      setServices(sv.data);
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      const dateStr = `${start.getFullYear()}-${(start.getMonth() + 1).toString().padStart(2, '0')}-${start.getDate().toString().padStart(2, '0')}`;
      setForm({
        workspace_id: String(b.workspace_id),
        date: dateStr,
        start_time: start.toTimeString().slice(0, 5),
        end_time: end.toTimeString().slice(0, 5),
      });
      setInitialDate(dateStr);
      setSelectedServices(b.bookingServices.map((bs) => ({ service_id: bs.service_id, quantity: bs.quantity })));
    });
  }, [id]);

  useEffect(() => {
    if (!form.date) return;
    setLoadingWorkspaces(true);
    api.get('/workspaces/pricing', { params: { date: form.date } })
      .then((r) => setWorkspaces(r.data))
      .finally(() => setLoadingWorkspaces(false));
    if (form.date !== initialDate) {
      setForm((prev) => ({ ...prev, workspace_id: '' }));
    }
  }, [form.date]);

  const toggleService = (serviceId: number) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.service_id === serviceId);
      if (exists) return prev.filter((s) => s.service_id !== serviceId);
      return [...prev, { service_id: serviceId, quantity: 1 }];
    });
  };

  const updateQuantity = (serviceId: number, quantity: number) => {
    setSelectedServices((prev) => prev.map((s) => s.service_id === serviceId ? { ...s, quantity: Math.max(1, quantity) } : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.put(`/bookings/${id}`, {
        workspace_id: parseInt(form.workspace_id),
        start_time: `${form.date}T${form.start_time}:00`,
        end_time: `${form.date}T${form.end_time}:00`,
        services: selectedServices,
      });
      navigate(-1);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Помилка оновлення';
      setError(msg);
    }
  };

  if (!booking) return <div className="loading">Завантаження...</div>;

  return (
    <div className="page">
      <h1>Редагування бронювання</h1>
      <form onSubmit={handleSubmit} className="form">
        {error && <div className="error-msg">{error}</div>}

        <label>
          Дата
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </label>

        <label>
          Робоче місце
          <select value={form.workspace_id} onChange={(e) => setForm({ ...form, workspace_id: e.target.value })} required disabled={loadingWorkspaces}>
            <option value="">{loadingWorkspaces ? 'Завантаження...' : 'Оберіть...'}</option>
            {workspaces.map((w) => (
              <option key={w.workspace_id} value={w.workspace_id}>
                {w.name} ({w.category.name}, {w.dynamic_price} грн/год)
              </option>
            ))}
          </select>
        </label>

        <div className="form-row">
          <label>
            Початок
            <input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
          </label>
          <label>
            Кінець
            <input type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
          </label>
        </div>

        {services.length > 0 && (
          <fieldset className="services-fieldset">
            <legend>Додаткові послуги</legend>
            {services.map((s) => {
              const selected = selectedServices.find((ss) => ss.service_id === s.service_id);
              return (
                <div key={s.service_id} className="service-row">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={!!selected} onChange={() => toggleService(s.service_id)} />
                    {s.name} — {s.price} грн
                  </label>
                  {selected && (
                    <input type="number" min={1} value={selected.quantity} onChange={(e) => updateQuantity(s.service_id, parseInt(e.target.value))} className="qty-input" />
                  )}
                </div>
              );
            })}
          </fieldset>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Зберегти</button>
          <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Скасувати</button>
        </div>
      </form>
    </div>
  );
}
