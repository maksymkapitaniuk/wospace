import { useEffect, useState } from 'react';
import api from '../../api';
import type { Subscription, Tariff } from '../../types';

const PER_PAGE = 5;

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [inactivePage, setInactivePage] = useState(1);

  const load = async () => {
    const [subs, tars] = await Promise.all([
      api.get('/tariffs/subscriptions'),
      api.get('/tariffs'),
    ]);
    setSubscriptions(subs.data);
    setTariffs(tars.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubscribe = async (tariffId: number) => {
    await api.post(`/tariffs/${tariffId}/subscribe`);
    load();
  };

  if (loading) return <div className="loading">Завантаження...</div>;

  const now = new Date();
  const active = subscriptions.filter((s) => {
    if (s.is_cancelled) return false;
    if (s.visits_left === 0) return false;
    if (s.end_date && new Date(s.end_date) < now) return false;
    return true;
  });
  const inactive = subscriptions.filter((s) => !active.includes(s));

  const activePages = Math.ceil(active.length / PER_PAGE);
  const inactivePages = Math.ceil(inactive.length / PER_PAGE);
  const pagedActive = active.slice((activePage - 1) * PER_PAGE, activePage * PER_PAGE);
  const pagedInactive = inactive.slice((inactivePage - 1) * PER_PAGE, inactivePage * PER_PAGE);

  const hasActive = active.length > 0;

  return (
    <div className="page">
      <h1>Підписки</h1>

      <h2>Доступні тарифи</h2>
      <div className="cards">
        {tariffs.map((t) => (
          <div key={t.tariff_id} className="card">
            <div className="card-header"><h3>{t.name}</h3></div>
            <div className="card-body">
              <p className="price-big">{t.price} грн</p>
              {t.details && typeof t.details === 'object' && (
                <ul className="tariff-details">
                  {(t.details as Record<string, unknown>).duration_days && <li>Тривалість: {String((t.details as Record<string, unknown>).duration_days)} днів</li>}
                  {(t.details as Record<string, unknown>).visits_limit && <li>Візити: {String((t.details as Record<string, unknown>).visits_limit)}</li>}
                </ul>
              )}
            </div>
            <div className="card-actions">
              <button onClick={() => handleSubscribe(t.tariff_id)} className="btn btn-primary btn-sm" disabled={hasActive} title={hasActive ? 'У вас вже є активна підписка' : ''}>Оформити</button>
            </div>
          </div>
        ))}
      </div>

      <h2>Дійсні підписки ({active.length})</h2>
      {active.length === 0 ? (
        <p className="empty">У вас немає дійсних підписок</p>
      ) : (
        <>
          <div className="cards">
            {pagedActive.map((s) => (
              <div key={s.subscription_id} className="card">
                <div className="card-header">
                  <h3>{s.tariff?.name}</h3>
                  <span className="badge badge-green">Дійсна</span>
                </div>
                <div className="card-body">
                  <p><strong>Початок:</strong> {new Date(s.start_date).toLocaleDateString('uk-UA')}</p>
                  {s.end_date && <p><strong>Кінець:</strong> {new Date(s.end_date).toLocaleDateString('uk-UA')}</p>}
                  <p><strong>Залишилось візитів:</strong> {s.visits_left ?? '∞'}</p>
                </div>
              </div>
            ))}
          </div>
          {activePages > 1 && (
            <div className="pagination">
              <button className="btn btn-sm btn-outline" disabled={activePage <= 1} onClick={() => setActivePage(activePage - 1)}>← Назад</button>
              <span className="pagination-info">Сторінка {activePage} з {activePages}</span>
              <button className="btn btn-sm btn-outline" disabled={activePage >= activePages} onClick={() => setActivePage(activePage + 1)}>Вперед →</button>
            </div>
          )}
        </>
      )}

      <h2 style={{ marginTop: '2rem' }}>Неактивні підписки ({inactive.length})</h2>
      {inactive.length === 0 ? (
        <p className="empty">Немає неактивних підписок</p>
      ) : (
        <>
          <div className="cards">
            {pagedInactive.map((s) => {
              const reason = s.is_cancelled
                ? 'Скасовано'
                : s.visits_left === 0
                  ? 'Візити вичерпано'
                  : 'Термін закінчився';
              return (
                <div key={s.subscription_id} className="card" style={{ opacity: 0.7 }}>
                  <div className="card-header">
                    <h3>{s.tariff?.name}</h3>
                    <span className="badge badge-red">{reason}</span>
                  </div>
                  <div className="card-body">
                    <p><strong>Початок:</strong> {new Date(s.start_date).toLocaleDateString('uk-UA')}</p>
                    {s.end_date && <p><strong>Кінець:</strong> {new Date(s.end_date).toLocaleDateString('uk-UA')}</p>}
                    <p><strong>Залишилось візитів:</strong> {s.visits_left ?? '∞'}</p>
                  </div>
                </div>
              );
            })}
          </div>
          {inactivePages > 1 && (
            <div className="pagination">
              <button className="btn btn-sm btn-outline" disabled={inactivePage <= 1} onClick={() => setInactivePage(inactivePage - 1)}>← Назад</button>
              <span className="pagination-info">Сторінка {inactivePage} з {inactivePages}</span>
              <button className="btn btn-sm btn-outline" disabled={inactivePage >= inactivePages} onClick={() => setInactivePage(inactivePage + 1)}>Вперед →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
