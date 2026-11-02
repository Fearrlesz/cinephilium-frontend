import React from 'react';
import { Link } from 'react-router-dom';
import '../LoginPage/LoginPage.css';

// Писем сайт не отправляет: ссылку на сброс выдаёт администратор вручную.
function ForgotPasswordPage() {
  return (
    <div className="container auth-container">
      <div className="auth-box glass-card">
        <h1>Восстановление пароля</h1>

        <p className="auth-hint">
          Пароль меняется по одноразовой ссылке. Письма сайт не отправляет,
          ссылку выдаёт администратор вручную.
        </p>

        <div className="auth-admin-callout">
          <p>
            Кому писать: открой страницу «Связь с админами» — там живые
            Telegram-контакты администраторов.
          </p>
          <Link to="/contact" className="auth-admin-cta">
            Связь с админами
          </Link>
        </div>

        <ol className="auth-steps">
          <li>Напиши администратору свой никнейм.</li>
          <li>Он сгенерирует ссылку в админке и пришлёт её тебе.</li>
          <li>Открой ссылку и задай новый пароль — она действует 30 минут.</li>
        </ol>

        <p className="auth-hint">
          После смены пароля все активные сессии закрываются: войти можно только с новым.
        </p>

        <p className="toggle-auth">
          <Link to="/login">Вернуться ко входу</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
