import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../utils/apiError';
import './LoginPage.css';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email: email.trim() });
      setMessage(response.data?.message || 'Если email существует, письмо отправлено');
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось отправить письмо'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-container">
      <div className="auth-box glass-card">
        <h1>Восстановление пароля</h1>

        {error && <div className="error-msg">{error}</div>}
        {message && <div className="success-msg">{message}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email, указанный при регистрации"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Отправляем...' : 'Отправить ссылку'}
          </button>
        </form>

        <p className="toggle-auth">
          <Link to="/login">Вернуться ко входу</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
