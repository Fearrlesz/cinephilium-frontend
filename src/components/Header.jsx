import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logout as apiLogout } from '../api/client';
import './Header.css';

const NAV = [
  { to: '/', label: 'Фильмы' },
  { to: '/critic', label: 'Архитектор' },
  { to: '/top', label: 'Топ' },
  { to: '/contact', label: 'Связь' },
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
              className={`nav-link ${location.pathname === item.to ? 'is-active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="tools">
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
