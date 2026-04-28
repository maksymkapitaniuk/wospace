import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const [role, setRole] = useState<'client' | 'manager' | 'admin'>('client');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(role, email, password);
      if (role === 'client') navigate('/bookings');
      else if (role === 'manager') navigate('/manager/bookings');
      else navigate('/admin/managers');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Помилка входу';
      setError(msg);
    }
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Вхід</h2>

        <div className="role-tabs">
          <button type="button" className={`tab ${role === 'client' ? 'active' : ''}`} onClick={() => setRole('client')}>Клієнт</button>
          <button type="button" className={`tab ${role === 'manager' ? 'active' : ''}`} onClick={() => setRole('manager')}>Менеджер</button>
          <button type="button" className={`tab ${role === 'admin' ? 'active' : ''}`} onClick={() => setRole('admin')}>Адмін</button>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Пароль
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>

        <button type="submit" className="btn btn-primary">Увійти</button>

        {role === 'client' && (
          <p className="auth-link">Немає акаунту? <Link to="/register">Зареєструватись</Link></p>
        )}
      </form>
    </div>
  );
}
