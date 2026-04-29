import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import type { Workspace, Service } from '../../types';

interface PricedWorkspace extends Workspace {
  dynamic_price: number;
}

export default function NewBookingPage() {
  const [workspaces, setWorkspaces] = useState<PricedWorkspace[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({
    workspace_id: '',
    date: '',
    start_time: '',
    end_time: '',
  });
  const [selectedServices, setSelectedServices] = useState<{ service_id: number; quantity: number }[]>([]);
  const [error, setError] = useState('');
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [hasSub, setHasSub] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/services').then((sv) => setServices(sv.data));
    api.get('/tariffs/subscriptions').then((r) => {
      const now = new Date();
      const active = (r.data as { is_cancelled: boolean; visits_left: number | null; end_date: string | null }[]).some(
        (s) => !s.is_cancelled && (s.visits_left === null || s.visits_left > 0) && (!s.end_date || new Date(s.end_date) >= now)
      );
      setHasSub(active);
    });
  }, []);

  useEffect(() => {
    if (!form.date) {
      setWorkspaces([]);
      setForm((prev) => ({ ...prev, workspace_id: '' }));
      return;
    }
    setLoadingWorkspaces(true);
    api.get('/workspaces/pricing', { params: { date: form.date } })
      .then((r) => setWorkspaces(r.data))
      .finally(() => setLoadingWorkspaces(false));
    setForm((prev) => ({ ...prev, workspace_id: '' }));
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
      await api.post('/bookings', {
        workspace_id: parseInt(form.workspace_id),
        start_time: `${form.date}T${form.start_time}:00`,
        end_time: `${form.date}T${form.end_time}:00`,
        services: selectedServices.length > 0 ? selectedServices : undefined,
      });
      navigate('/bookings');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Помилка створення';
      setError(msg);
    }
  };

  return (
    <div className="page">
      <h1>Нове бронювання</h1>
      <form onSubmit={handleSubmit} className="form">
        {error && <div className="error-msg">{error}</div>}
        {hasSub && <div className="info-msg">У вас є активна підписка — бронювання буде безкоштовним</div>}

        <label>
          Дата
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
        </label>

        <label>
          Робоче місце
          <select value={form.workspace_id} onChange={(e) => setForm({ ...form, workspace_id: e.target.value })} required disabled={!form.date || loadingWorkspaces}>
            <option value="">{!form.date ? 'Спочатку оберіть дату' : loadingWorkspaces ? 'Завантаження...' : 'Оберіть...'}</option>
            {workspaces.map((w) => (
              <option key={w.workspace_id} value={w.workspace_id}>
                {w.name} ({w.category.name}, {w.capacity} місць, {hasSub ? 0 : w.dynamic_price} грн/год)
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
                    {s.name} — {hasSub ? 0 : s.price} грн
                  </label>
                  {selected && (
                    <input type="number" min={1} value={selected.quantity} onChange={(e) => updateQuantity(s.service_id, parseInt(e.target.value))} className="qty-input" />
                  )}
                </div>
              );
            })}
          </fieldset>
        )}

        <button type="submit" className="btn btn-primary">Створити бронювання</button>
      </form>
    </div>
  );
}
