import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import type { Workspace, Service } from '../../types';

export default function ManagerNewBookingPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({
    client_identifier: '',
    workspace_id: '',
    date: '',
    start_time: '',
    end_time: '',
  });
  const [selectedServices, setSelectedServices] = useState<{ service_id: number; quantity: number }[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/workspaces'), api.get('/services')]).then(([ws, sv]) => {
      setWorkspaces(ws.data);
      setServices(sv.data);
    });
  }, []);

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
        client_identifier: form.client_identifier,
        workspace_id: parseInt(form.workspace_id),
        start_time: `${form.date}T${form.start_time}:00`,
        end_time: `${form.date}T${form.end_time}:00`,
        services: selectedServices.length > 0 ? selectedServices : undefined,
      });
      navigate('/manager/bookings');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Помилка створення';
      setError(msg);
    }
  };

  return (
    <div className="page">
      <h1>Нове бронювання (менеджер)</h1>
      <form onSubmit={handleSubmit} className="form">
        {error && <div className="error-msg">{error}</div>}

        <label>
          Email або телефон клієнта
          <input type="text" value={form.client_identifier} onChange={(e) => setForm({ ...form, client_identifier: e.target.value })} required placeholder="email@example.com або +380..." />
        </label>

        <label>
          Робоче місце
          <select value={form.workspace_id} onChange={(e) => setForm({ ...form, workspace_id: e.target.value })} required>
            <option value="">Оберіть...</option>
            {workspaces.map((w) => (
              <option key={w.workspace_id} value={w.workspace_id}>
                {w.name} ({w.category.name}, {w.capacity} місць, {w.base_price} грн/год)
              </option>
            ))}
          </select>
        </label>

        <label>
          Дата
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
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

        <button type="submit" className="btn btn-primary">Створити бронювання</button>
      </form>
    </div>
  );
}
