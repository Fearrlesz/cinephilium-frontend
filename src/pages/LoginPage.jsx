import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useNotification } from '../context/NotificationContext';
import { validateEmail, validatePassword, validateNickname } from '../utils/ratingUtils';
import './LoginPage.css';

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!validateEmail(email)) {
      setError('Введите корректный email');
      setLoading(false);
      return;
    }
    if (!validatePassword(password)) {
      setError('Пароль должен содержать минимум 6 символов');
      setLoading(false);
      return;
    }
    if (!isLogin && !validateNickname(nickname)) {
      setError('Никнейм должен быть от 2 до 20 символов');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const data = isLogin ? { email, password } : { email, password, nickname };
      const response = await api.post(endpoint, data);
      localStorage.setItem('token', response.data.token);
      navigate('/');
      showNotification({ 
        title: isLogin ? 'Добро пожаловать!' : 'Регистрация прошла успешно!', 
        message: isLogin ? 'Вы вошли в аккаунт' : 'Добро пожаловать в Синефилиум!', 
        type: 'success' 
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-container">
      <div className="auth-box glass-card">
        <h1>{isLogin ? 'Вход в Синефилиум' : 'Регистрация'}</h1>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          {!isLogin && (
            <input type="text" placeholder="Никнейм" value={nickname} onChange={(e) => setNickname(e.target.value)} required minLength={2} maxLength={20} />
          )}
          <input type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button type="submit" disabled={loading}>{loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}</button>
        </form>
        <p onClick={() => { setIsLogin(!isLogin); setError(''); }} className="toggle-auth">
          {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
