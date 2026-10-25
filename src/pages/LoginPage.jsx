import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { setAccessToken, getAccessToken } from '../api/client';
import { getErrorMessage } from '../utils/apiError';
import { useNotification } from '../context/NotificationContext';
import { validateEmail, validatePassword, validateNickname } from '../utils/ratingUtils';
import './LoginPage.css';

const PASSWORD_MIN = 8;
const CONSENT_VERSION = '1.0';

function LoginPage() {
  // login  — вход
  // register — регистрация
  // verify  — ввод кода подтверждения email
  const [stage, setStage] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState('');
  const [consentPersonal, setConsentPersonal] = useState(false);
  const [consentCookies, setConsentCookies] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    if (getAccessToken()) {
      navigate('/');
    }
  }, [navigate]);

  const finishAuth = (accessToken) => {
    setAccessToken(accessToken);
    showNotification({
      title: 'Добро пожаловать!',
      message: 'Вы вошли в аккаунт',
      type: 'success'
    });
    navigate('/');
  };

  const validateCredentials = () => {
    if (!validateEmail(email)) {
      setError('Введите корректный email');
      return false;
    }
    if (!validatePassword(password)) {
      setError(`Пароль должен содержать минимум ${PASSWORD_MIN} символов`);
      return false;
    }
    if (stage === 'register') {
      if (!validateNickname(nickname)) {
        setError('Никнейм должен быть от 2 до 20 символов');
        return false;
      }
      if (!consentPersonal || !consentCookies) {
        setError('Нужно согласие на обработку персональных данных и использование cookie');
        return false;
      }
    }
    return true;
  };

  const submitLogin = async () => {
    const response = await api.post('/auth/login', { email, password });
    const accessToken = response.data?.accessToken;
    if (!accessToken) throw new Error('Сервер не вернул accessToken');
    finishAuth(accessToken);
  };

  const submitRegister = async () => {
    const response = await api.post('/auth/register', {
      email,
      password,
      nickname,
      consent: {
        personalData: true,
        cookies: true,
        version: CONSENT_VERSION
      }
    });
    setPassword('');
    setStage('verify');
    setInfo(response.data?.message || 'Проверьте почту: мы отправили код подтверждения');
    showNotification({
      title: 'Почти готово',
      message: 'Подтвердите email кодом из письма',
      type: 'info'
    });
  };

  const submitVerify = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Код должен состоять из 6 цифр');
      return;
    }
    const response = await api.post('/auth/verify-email', { email, code: code.trim() });
    const accessToken = response.data?.accessToken;
    if (!accessToken) throw new Error('Сервер не вернул accessToken');
    finishAuth(accessToken);
  };

  const resendCode = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/auth/resend-verification', { email });
      setInfo(response.data?.message || 'Код отправлен повторно');
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось отправить код повторно'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (stage === 'verify') {
        await submitVerify();
        return;
      }
      if (!validateCredentials()) return;
      if (stage === 'login') {
        await submitLogin();
      } else {
        await submitRegister();
      }
    } catch (err) {
      setError(getErrorMessage(err, stage === 'login' ? 'Не удалось войти' : 'Не удалось зарегистрироваться'));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next) => {
    setStage(next);
    setError('');
    setInfo('');
    setCode('');
  };

  const title = stage === 'verify'
    ? 'Подтверждение email'
    : stage === 'login'
      ? 'Вход в Синефилиум'
      : 'Регистрация';

  const buttonLabel = stage === 'verify'
    ? 'Подтвердить'
    : stage === 'login'
      ? 'Войти'
      : 'Зарегистрироваться';

  return (
    <div className="container auth-container">
      <div className="auth-box glass-card">
        <h1>{title}</h1>

        {error && <div className="error-msg">{error}</div>}
        {info && <div className="success-msg">{info}</div>}

        <form onSubmit={handleSubmit}>
          {stage === 'verify' ? (
            <>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Код из письма"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                autoComplete="one-time-code"
                required
              />
              <button type="submit" disabled={loading}>
                {loading ? 'Проверяем...' : buttonLabel}
              </button>
            </>
          ) : (
            <>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              {stage === 'register' && (
                <input
                  type="text"
                  placeholder="Никнейм"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  minLength={2}
                  maxLength={20}
                />
              )}
              <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={stage === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={PASSWORD_MIN}
              />

              {stage === 'register' && (
                <div className="consent-block">
                  <label className="consent-check">
                    <input
                      type="checkbox"
                      checked={consentPersonal}
                      onChange={(e) => setConsentPersonal(e.target.checked)}
                    />
                    <span>
                      Согласен на{' '}
                      <Link to="/privacy#personal-data" target="_blank" rel="noopener noreferrer">
                        обработку персональных данных
                      </Link>
                    </span>
                  </label>
                  <label className="consent-check">
                    <input
                      type="checkbox"
                      checked={consentCookies}
                      onChange={(e) => setConsentCookies(e.target.checked)}
                    />
                    <span>
                      Согласен на{' '}
                      <Link to="/privacy#cookies" target="_blank" rel="noopener noreferrer">
                        использование cookie
                      </Link>
                    </span>
                  </label>
                </div>
              )}

              <button type="submit" disabled={loading}>
                {loading ? 'Загрузка...' : buttonLabel}
              </button>
            </>
          )}
        </form>

        {stage === 'login' && (
          <p className="toggle-auth">
            <Link to="/forgot-password">Забыли пароль?</Link>
          </p>
        )}

        {stage === 'verify' && (
          <p className="toggle-auth" onClick={loading ? undefined : resendCode}>
            Отправить код ещё раз
          </p>
        )}

        {stage === 'verify' ? (
          <p className="toggle-auth" onClick={() => switchMode('login')}>
            Вернуться ко входу
          </p>
        ) : (
          <p className="toggle-auth" onClick={() => switchMode(stage === 'login' ? 'register' : 'login')}>
            {stage === 'login' ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
          </p>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
