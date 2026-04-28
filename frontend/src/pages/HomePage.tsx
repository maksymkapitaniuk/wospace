import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="page home-page">
      <div className="hero-section">
        <h1>CoWork</h1>
        <p className="hero-text">Сучасний коворкінг-центр для продуктивної роботи</p>

        {!user && (
          <div className="hero-actions">
            <Link to="/register" className="btn btn-primary btn-lg">Зареєструватись</Link>
            <Link to="/login" className="btn btn-outline btn-lg">Увійти</Link>
          </div>
        )}

        {user?.role === 'client' && (
          <div className="hero-actions">
            <Link to="/bookings/new" className="btn btn-primary btn-lg">Забронювати місце</Link>
            <Link to="/bookings" className="btn btn-outline btn-lg">Мої бронювання</Link>
          </div>
        )}

        {user?.role === 'manager' && (
          <div className="hero-actions">
            <Link to="/manager/bookings" className="btn btn-primary btn-lg">Переглянути бронювання</Link>
          </div>
        )}

        {user?.role === 'admin' && (
          <div className="hero-actions">
            <Link to="/admin/managers" className="btn btn-primary btn-lg">Панель адміністратора</Link>
          </div>
        )}
      </div>
    </div>
  );
}
