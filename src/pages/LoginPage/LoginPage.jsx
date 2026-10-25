import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { setAccessToken, getAccessToken } from '../../api/client';
import { getErrorMessage } from '../../utils/apiError';
import { useNotification } from '../../context/NotificationContext';
import { validatePassword, validateNickname } from '../../utils/ratingUtils';
import './LoginPage.css';

const PASSWORD_MIN = 8;
const CONSENT_VERSION = '1.0';

function LoginPage() {
  // login    — вход по никнейму
  // register — регистрация по инвайт-коду от администратора
  const [stage, setStage] = useState('login');
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
    if (getAccessToken()) {
      navigate('/');
    }
  }, [navigate]);

  // Спрашиваем у бэкенда, открыта регистрация или только по инвайтам.
  useEffect(() => {
    let cancelled = false;
    api.get('/auth/config')
      .then(response => {
        if (cancelled) return;
        setInviteRequired(response.data?.inviteRequired !== false);
      })
      .catch(() => {
        // Если конфиг недоступен, форма просто попросит код: бэкенд всё равно проверит.
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
  };

  const title = stage === 'login' ? 'Вход в Синефилиум' : 'Регистрация';
  const buttonLabel = stage === 'login' ? 'Войти' : 'Зарегистрироваться';

  return (
    <div className="container auth-container">
      <div className="auth-box glass-card">
        <h1>{title}</h1>

        {error && <div className="error-msg">{error}</div>}
        {info && <div className="success-msg">{info}</div>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Никнейм"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoComplete="username"
            required
            minLength={2}
            maxLength={20}
          />

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
            <>
              <input
                type="text"
                placeholder={inviteRequired ? 'Инвайт-код (например ABCD-EFGH)' : 'Инвайт-код (необязательно)'}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                autoComplete="off"
                spellCheck={false}
                required={inviteRequired}
              />
              <p className="auth-hint">
                {inviteRequired
                  ? 'Код выдаёт администратор. Один код — один аккаунт.'
                  : 'Регистрация открыта, код можно не вводить.'}
              </p>

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
            </>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Загрузка...' : buttonLabel}
          </button>
        </form>

        {stage === 'login' && (
          <p className="toggle-auth">
            <Link to="/forgot-password">Забыли пароль?</Link>
          </p>
        )}

        <p className="toggle-auth" onClick={() => switchMode(stage === 'login' ? 'register' : 'login')}>
          {stage === 'login' ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
