import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api, { logout as apiLogout } from '../../api/client';
import './Header.css';

const NAV = [
  { to: '/catalog', label: 'Каталог' },
  { to: '/critic', label: 'Архитектор' },
  { to: '/top', label: 'Топ' },
  { to: '/about', label: 'О системе' }
];

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // DECISION: шапка сама читает сессию. Так её можно подключить одним
  // layout-компонентом ко всем публичным страницам, не протаскивая user
  // через props каждой страницы.
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      return;
    }
    let alive = true;
    api.get('/auth/me')
      .then(res => { if (alive) setUser(res.data); })
      .catch(err => {
        if (!alive) return;
        if (err.response?.status === 401) localStorage.removeItem('token');
        setUser(null);
      });
    return () => { alive = false; };
  }, [location.pathname]);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      localStorage.removeItem('token');
      setUser(null);
      setMenuOpen(false);
      navigate('/');
    }
  }, [navigate]);

  const initial = (user?.nickname || '?').charAt(0).toUpperCase();
  const isActive = (to) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <header className="hdr">
      <div className="hdr-in">
        <Link to="/" className="brand" aria-label="Cinephilium — на главную">
          Cinephilium
        </Link>

        <nav className="nav" aria-label="Основная навигация">
          {NAV.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link${isActive(item.to) ? ' is-active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="tools">
          <Link to="/catalog?focus=search" className="tool-link tool-search">
            Поиск
          </Link>
          <Link to="/contact" className="tool-link tool-contact">
            <span className="tool-contact-dot" aria-hidden="true" />
            <span className="tool-contact-full">Связь с админами</span>
            <span className="tool-contact-short">Админы</span>
          </Link>
          {user ? (
            <>
              <Link
                to="/profile"
                className="avatar"
                title={user.nickname}
                aria-label={`Профиль ${user.nickname}`}
              >
                {initial}
              </Link>
              {user.isAdmin && <Link to="/admin" className="tool-link">Админ</Link>}
              <button type="button" className="tool-link" onClick={handleLogout}>
                Выйти
              </button>
            </>
          ) : (
            <Link to="/login" className="tool-link">Войти</Link>
          )}
          <button
            type="button"
            className="hdr-burger"
            aria-expanded={menuOpen}
            aria-controls="hdr-mobile"
            onClick={() => setMenuOpen(open => !open)}
          >
            Меню
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="hdr-mobile" id="hdr-mobile">
          <nav className="hdr-mobile-nav" aria-label="Мобильная навигация">
            {NAV.map(item => (
              <Link key={item.to} to={item.to} className="hdr-mobile-link">
                {item.label}
              </Link>
            ))}
            <Link to="/catalog?focus=search" className="hdr-mobile-link">Поиск</Link>
            <Link to="/contact" className="hdr-mobile-link">Связь с админами</Link>
            {user?.isAdmin && <Link to="/admin" className="hdr-mobile-link">Админка</Link>}
          </nav>
        </div>
      )}
    </header>
  );
}

export default Header;
