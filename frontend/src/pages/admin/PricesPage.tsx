import { useEffect, useState } from 'react';
import api from '../../api';
import type { Workspace, Service, Tariff } from '../../types';

export default function PricesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [editing, setEditing] = useState<{ type: string; id: number } | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [ws, sv, tr] = await Promise.all([
      api.get('/workspaces'),
      api.get('/services'),
      api.get('/tariffs'),
    ]);
    setWorkspaces(ws.data);
    setServices(sv.data);
    setTariffs(tr.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (type: string, id: number, currentPrice: string) => {
    setEditing({ type, id });
    setNewPrice(currentPrice);
  };

  const savePrice = async () => {
    if (!editing) return;
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) return;

    if (editing.type === 'workspace') {
      await api.put(`/admin/workspaces/${editing.id}/price`, { base_price: price });
    } else if (editing.type === 'service') {
      await api.put(`/admin/services/${editing.id}/price`, { price });
    } else if (editing.type === 'tariff') {
      await api.put(`/admin/tariffs/${editing.id}/price`, { price });
    }
    setEditing(null);
    load();
  };

  if (loading) return <div className="loading">Завантаження...</div>;

  return (
    <div className="page">
      <h1>Управління цінами</h1>

      <h2>Робочі місця</h2>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr><th>Назва</th><th>Категорія</th><th>Місткість</th><th>Ціна/год</th><th>Дії</th></tr>
          </thead>
          <tbody>
            {workspaces.map((w) => (
              <tr key={w.workspace_id}>
                <td>{w.name}</td>
                <td>{w.category.name}</td>
                <td>{w.capacity}</td>
                <td>
                  {editing?.type === 'workspace' && editing.id === w.workspace_id ? (
                    <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="price-input" min="0.01" step="0.01" />
                  ) : (
                    <>{w.base_price} грн</>
                  )}
                </td>
                <td>
                  {editing?.type === 'workspace' && editing.id === w.workspace_id ? (
                    <div className="actions">
                      <button onClick={savePrice} className="btn btn-sm btn-primary">Зберегти</button>
                      <button onClick={() => setEditing(null)} className="btn btn-sm btn-outline">Скасувати</button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit('workspace', w.workspace_id, w.base_price)} className="btn btn-sm btn-outline">Змінити</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Послуги</h2>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr><th>Назва</th><th>Опис</th><th>Ціна</th><th>Дії</th></tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.service_id}>
                <td>{s.name}</td>
                <td>{s.description || '—'}</td>
                <td>
                  {editing?.type === 'service' && editing.id === s.service_id ? (
                    <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="price-input" min="0.01" step="0.01" />
                  ) : (
                    <>{s.price} грн</>
                  )}
                </td>
                <td>
                  {editing?.type === 'service' && editing.id === s.service_id ? (
                    <div className="actions">
                      <button onClick={savePrice} className="btn btn-sm btn-primary">Зберегти</button>
                      <button onClick={() => setEditing(null)} className="btn btn-sm btn-outline">Скасувати</button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit('service', s.service_id, s.price)} className="btn btn-sm btn-outline">Змінити</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Тарифи</h2>
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr><th>Назва</th><th>Ціна</th><th>Дії</th></tr>
          </thead>
          <tbody>
            {tariffs.map((t) => (
              <tr key={t.tariff_id}>
                <td>{t.name}</td>
                <td>
                  {editing?.type === 'tariff' && editing.id === t.tariff_id ? (
                    <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="price-input" min="0.01" step="0.01" />
                  ) : (
                    <>{t.price} грн</>
                  )}
                </td>
                <td>
                  {editing?.type === 'tariff' && editing.id === t.tariff_id ? (
                    <div className="actions">
                      <button onClick={savePrice} className="btn btn-sm btn-primary">Зберегти</button>
                      <button onClick={() => setEditing(null)} className="btn btn-sm btn-outline">Скасувати</button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit('tariff', t.tariff_id, t.price)} className="btn btn-sm btn-outline">Змінити</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
