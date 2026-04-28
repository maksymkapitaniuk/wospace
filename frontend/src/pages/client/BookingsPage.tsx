import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api';
import type { Booking } from '../../types';

const PER_PAGE = 10;

export default function BookingsPage() {
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [upcomingTotal, setUpcomingTotal] = useState(0);
  const [pastTotal, setPastTotal] = useState(0);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchUpcoming = (page: number) =>
    api.get('/bookings', { params: { period: 'upcoming', page, limit: PER_PAGE } }).then((r) => {
      setUpcoming(r.data.data);
      setUpcomingTotal(r.data.total);
    });

  const fetchPast = (page: number) =>
    api.get('/bookings', { params: { period: 'past', page, limit: PER_PAGE } }).then((r) => {
      setPast(r.data.data);
      setPastTotal(r.data.total);
    });

  useEffect(() => {
    Promise.all([fetchUpcoming(1), fetchPast(1)]).finally(() => setLoading(false));
  }, []);

  const changeUpcomingPage = (p: number) => { setUpcomingPage(p); fetchUpcoming(p); };
  const changePastPage = (p: number) => { setPastPage(p); fetchPast(p); };

  const handleDelete = async (id: number) => {
    if (!confirm('Видалити бронювання?')) return;
    await api.delete(`/bookings/${id}`);
    fetchUpcoming(upcomingPage);
    fetchPast(pastPage);
  };

  if (loading) return <div className="loading">Завантаження...</div>;

  const upcomingPages = Math.ceil(upcomingTotal / PER_PAGE);
  const pastPages = Math.ceil(pastTotal / PER_PAGE);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Мої бронювання</h1>
        <Link to="/bookings/new" className="btn btn-primary">Нове бронювання</Link>
      </div>

      <h2>Активні ({upcomingTotal})</h2>
      {upcoming.length === 0 ? (
        <p className="empty">У вас поки немає майбутніх бронювань</p>
      ) : (
        <>
          <div className="cards">
            {upcoming.map((b) => (
              <div key={b.booking_id} className="card">
                <div className="card-header">
                  <h3>{b.workspace.name}</h3>
                  <span className="badge">{b.workspace.category.name}</span>
                </div>
                <div className="card-body">
                  <p><strong>Початок:</strong> {new Date(b.start_time).toLocaleString('uk-UA')}</p>
                  <p><strong>Кінець:</strong> {new Date(b.end_time).toLocaleString('uk-UA')}</p>
                  <p><strong>Ціна:</strong> {b.total_price} грн</p>
                  {b.bookingServices.length > 0 && (
                    <div className="services-list">
                      <strong>Послуги:</strong>
                      {b.bookingServices.map((bs) => (
                        <span key={bs.service_id} className="service-tag">{bs.service.name} ×{bs.quantity}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="card-actions">
                  <Link to={`/bookings/${b.booking_id}/edit`} className="btn btn-sm btn-outline">Редагувати</Link>
                  <button onClick={() => handleDelete(b.booking_id)} className="btn btn-sm btn-danger">Видалити</button>
                </div>
              </div>
            ))}
          </div>
          {upcomingPages > 1 && (
            <div className="pagination">
              <button className="btn btn-sm btn-outline" disabled={upcomingPage <= 1} onClick={() => changeUpcomingPage(upcomingPage - 1)}>← Назад</button>
              <span className="pagination-info">Сторінка {upcomingPage} з {upcomingPages}</span>
              <button className="btn btn-sm btn-outline" disabled={upcomingPage >= upcomingPages} onClick={() => changeUpcomingPage(upcomingPage + 1)}>Вперед →</button>
            </div>
          )}
        </>
      )}

      <h2 style={{ marginTop: '2rem' }}>Минулі ({pastTotal})</h2>
      {past.length === 0 ? (
        <p className="empty">Немає минулих бронювань</p>
      ) : (
        <>
          <div className="cards">
            {past.map((b) => (
              <div key={b.booking_id} className="card" style={{ opacity: 0.7 }}>
                <div className="card-header">
                  <h3>{b.workspace.name}</h3>
                  <span className="badge">{b.workspace.category.name}</span>
                </div>
                <div className="card-body">
                  <p><strong>Початок:</strong> {new Date(b.start_time).toLocaleString('uk-UA')}</p>
                  <p><strong>Кінець:</strong> {new Date(b.end_time).toLocaleString('uk-UA')}</p>
                  <p><strong>Ціна:</strong> {b.total_price} грн</p>
                  {b.bookingServices.length > 0 && (
                    <div className="services-list">
                      <strong>Послуги:</strong>
                      {b.bookingServices.map((bs) => (
                        <span key={bs.service_id} className="service-tag">{bs.service.name} ×{bs.quantity}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {pastPages > 1 && (
            <div className="pagination">
              <button className="btn btn-sm btn-outline" disabled={pastPage <= 1} onClick={() => changePastPage(pastPage - 1)}>← Назад</button>
              <span className="pagination-info">Сторінка {pastPage} з {pastPages}</span>
              <button className="btn btn-sm btn-outline" disabled={pastPage >= pastPages} onClick={() => changePastPage(pastPage + 1)}>Вперед →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
