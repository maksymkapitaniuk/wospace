import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', surname: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Паролі не збігаються');
      return;
    }
    try {
      await register(form);
      navigate('/bookings');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Помилка реєстрації';
      setError(msg);
    }
  };

  return (
    <div className="auth-page">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Реєстрація</h2>

        {error && <div className="error-msg">{error}</div>}

        <label>
          Імʼя
          <input name="name" value={form.name} onChange={handleChange} required />
        </label>
        <label>
          Прізвище
          <input name="surname" value={form.surname} onChange={handleChange} required />
        </label>
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={handleChange} required />
        </label>
        <label>
          Телефон
          <input name="phone" type="tel" value={form.phone} onChange={handleChange} required placeholder="+380..." />
        </label>
        <label>
          Пароль
          <input name="password" type="password" value={form.password} onChange={handleChange} required />
        </label>
        <label>
          Підтвердження пароля
          <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} required />
        </label>

        <button type="submit" className="btn btn-primary">Зареєструватись</button>
        <p className="auth-link">Вже маєте акаунт? <Link to="/login">Увійти</Link></p>
      </form>
    </div>
  );
}
