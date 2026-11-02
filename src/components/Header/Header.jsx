import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout as apiLogout } from '../../api/client';
import './Header.css';

const NAV = [
  { to: '/', label: 'Фильмы' },
  { to: '/critic', label: 'Архитектор' },
  { to: '/top', label: 'Топ' },
  { to: '/contact', label: 'Связь с админами', contact: true },
  { to: '/about', label: 'О системе' }
];

function Header({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
      return;
    }
    await apiLogout();
    navigate('/');
  };

  const initial = (user?.nickname || '?').charAt(0).toUpperCase();

  return (
    <header className="hdr">
      <div className="hdr-in">
        <Link to="/" className="brand" aria-label="Cinephilium — на главную">
          <span>Cinephilium</span>
        </Link>

        <nav className="nav" aria-label="Основная навигация">
          {NAV.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${item.contact ? 'nav-link--contact' : ''} ${location.pathname === item.to ? 'is-active' : ''}`}
              aria-label={item.contact ? 'Связь с админами' : undefined}
            >
              {item.contact ? (
                <>
                  <span className="nav-contact-full">{item.label}</span>
                  <span className="nav-contact-short">Админы</span>
                </>
              ) : item.label}
            </Link>
          ))}
        </nav>

        <div className="tools">
          <Link
            to="/contact"
            className="tool-link tool-link--contact"
            aria-label="Связь с админами"
          >
            <span className="tool-contact-dot" aria-hidden="true" />
            Админы
          </Link>
          {user ? (
            <>
              <Link
                to={`/user/${user._id}`}
                className="avatar" title={user.nickname}
                aria-label={`Профиль ${user.nickname}`}
              >
                {initial}
              </Link>
              {user.isAdmin && (
                <Link to="/admin" className="tool-link">Админ</Link>
              )}
              <button type="button" className="tool-link" onClick={handleLogout}>
                Выйти
              </button>
            </>
          ) : (
            <Link to="/login" className="tool-link">Войти</Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
