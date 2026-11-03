import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { setAccessToken, getAccessToken } from '../../api/client';
import { getErrorMessage } from '../../utils/apiError';
import { useNotification } from '../../context/NotificationContext';
import { validatePassword, validateNickname } from '../../utils/ratingUtils';
import '../../components/AuthLayout/AuthLayout.css';

const PASSWORD_MIN = 8;
const CONSENT_VERSION = '1.0';

function LoginPage({ initialStage = 'login' }) {
  // login    — вход по никнейму
  // register — регистрация по инвайт-коду от администратора
  const [stage] = useState(initialStage);
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteRequired, setInviteRequired] = useState(true);
  const [consentPersonal, setConsentPersonal] = useState(false);
  const [consentCookies, setConsentCookies] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  useEffect(() => {
    if (getAccessToken()) navigate('/');
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    api.get('/auth/config')
      .then(response => {
        if (cancelled) return;
        setInviteRequired(response.data?.inviteRequired !== false);
      })
      .catch(() => {
        if (!cancelled) setInviteRequired(true);
      });
    return () => { cancelled = true; };
  }, []);

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
    if (!validateNickname(nickname.trim())) {
      setError('Никнейм должен быть от 2 до 20 символов');
      return false;
    }
    if (!validatePassword(password)) {
      setError(`Пароль должен содержать минимум ${PASSWORD_MIN} символов`);
      return false;
    }
    if (stage === 'register') {
      if (inviteRequired && !inviteCode.trim()) {
        setError('Введите инвайт-код — его выдаёт администратор');
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
    const response = await api.post('/auth/login', { nickname: nickname.trim(), password });
    const accessToken = response.data?.accessToken;
    if (!accessToken) throw new Error('Сервер не вернул accessToken');
    finishAuth(accessToken);
  };

  const submitRegister = async () => {
    const response = await api.post('/auth/register', {
      nickname: nickname.trim(),
      password,
      inviteCode: inviteCode.trim() || undefined,
      consent: {
        personalData: true,
        cookies: true,
        version: CONSENT_VERSION
      }
    });
    const accessToken = response.data?.accessToken;
    if (!accessToken) throw new Error('Сервер не вернул accessToken');
    showNotification({
      title: 'Аккаунт создан',
      message: 'Добро пожаловать в Синефилиум',
      type: 'success'
    });
    finishAuth(accessToken);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      if (!validateCredentials()) return;
      if (stage === 'login') await submitLogin();
      else await submitRegister();
    } catch (err) {
      setError(getErrorMessage(err, stage === 'login' ? 'Не удалось войти' : 'Не удалось зарегистрироваться'));
    } finally {
      setLoading(false);
    }
  };

  const isLogin = stage === 'login';

  return (
    <div className="auth-box">
      <p className="auth-kicker">{isLogin ? 'Вход' : 'Регистрация'}</p>
      <h1 className="auth-title">{isLogin ? 'С возвращением' : 'Новый аккаунт'}</h1>
      <p className="auth-subtitle">
        {isLogin
          ? 'Войдите, чтобы оценивать фильмы и вести дневник.'
          : 'Регистрация по инвайт-коду от администратора.'}
      </p>

      {error && <div className="auth-error">{error}</div>}
      {info && <div className="auth-success">{info}</div>}

      <form onSubmit={handleSubmit}>
        <label className="auth-field">
          <span>Никнейм</span>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoComplete="username"
            required
            minLength={2}
            maxLength={20}
          />
        </label>

        <label className="auth-field">
          <span>Пароль</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
            minLength={PASSWORD_MIN}
          />
        </label>

        {isLogin && (
          <p className="auth-admin-inline">
            Нет доступа к аккаунту? <Link to="/contact">Связь с админами</Link>
          </p>
        )}

        {!isLogin && (
          <>
            <label className="auth-field">
              <span>Инвайт-код</span>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                autoComplete="off"
                spellCheck={false}
                required={inviteRequired}
              />
            </label>
            <p className="auth-hint">
              {inviteRequired
                ? 'Код выдаёт администратор. Один код — один аккаунт.'
                : 'Регистрация открыта, код можно не вводить.'}
            </p>
            {inviteRequired && (
              <p className="auth-hint">
                Нет кода? <Link to="/contact">Связь с админами</Link>
              </p>
            )}

            <label className="auth-check">
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
            <label className="auth-check">
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
          </>
        )}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? 'Загрузка…' : isLogin ? 'Войти' : 'Зарегистрироваться'}
        </button>
      </form>

      <div className="auth-links">
        {isLogin ? (
          <>
            <p><Link to="/forgot-password">Забыли пароль?</Link></p>
            <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
          </>
        ) : (
          <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
