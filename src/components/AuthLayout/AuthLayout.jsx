import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import './AuthLayout.css';

function AuthLayout() {
  return (
    <div className="auth-shell">
      <header className="auth-top">
        <Link to="/" className="auth-wordmark">Cinephilium</Link>
        <Link to="/" className="auth-top-link">На главную</Link>
      </header>

      <main className="auth-layout">
        <aside className="auth-aside">
          <p className="auth-kicker">Теперь уже точно</p>
          <h2 className="auth-aside-title">
            Рейтинг.<br />Отражающий глубину фильма
          </h2>
          <p className="auth-aside-text">
            15 критериев, технический балл и вайб.
            Больше никаких безосновательных оценок. Все критерии прозрачны.
          </p>
          <ul className="auth-facts">
            <li><span>01</span>Техническая оценка по 15 критериям</li>
            <li><span>02</span>Вайб — один клик, если смотрел</li>
            <li><span>03</span>Дневник, рецензии и обсуждения</li>
          </ul>
        </aside>

        <section className="auth-panel">
          <Outlet />
        </section>
      </main>
    </div>
  );
}

export default AuthLayout;
