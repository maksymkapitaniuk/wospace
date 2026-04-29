import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="logo">WoSpace</Link>
          <nav className="nav">
            {!user && (
              <>
                <Link to="/login">Увійти</Link>
                <Link to="/register">Реєстрація</Link>
              </>
            )}
            {user?.role === 'client' && (
              <>
                <Link to="/bookings">Мої бронювання</Link>
                <Link to="/bookings/new">Забронювати</Link>
                <Link to="/subscriptions">Підписки</Link>
                <Link to="/profile">Профіль</Link>
              </>
            )}
            {user?.role === 'manager' && (
              <>
                <Link to="/manager/bookings">Бронювання</Link>
                <Link to="/manager/schedule">Завантаженість</Link>
                <Link to="/manager/analytics">Аналітика</Link>
                <Link to="/manager/users">Користувачі</Link>
                <Link to="/manager/bookings/new">Нове бронювання</Link>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <Link to="/admin/managers">Менеджери</Link>
                <Link to="/admin/administrators">Адміністратори</Link>
                <Link to="/admin/prices">Ціни</Link>
                <Link to="/admin/users">Користувачі</Link>
                <Link to="/admin/profile">Профіль</Link>
              </>
            )}
            {user && (
              <div className="user-menu">
                <span className="user-name">{user.full_name}</span>
                <button onClick={handleLogout} className="btn btn-outline btn-sm">Вийти</button>
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
