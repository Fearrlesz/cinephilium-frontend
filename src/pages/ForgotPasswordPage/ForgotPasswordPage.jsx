import React from 'react';
import { Link } from 'react-router-dom';

// Писем сайт не отправляет: ссылку на сброс выдаёт администратор вручную.
function ForgotPasswordPage() {
  return (
    <div className="auth-box auth-document">
      <p className="auth-kicker">Доступ</p>
      <h1 className="auth-title">Восстановление пароля</h1>
      <p className="auth-subtitle">
        Пароль меняется по одноразовой ссылке. Письма сайт не отправляет,
        ссылку выдаёт администратор вручную.
      </p>

      <div className="auth-admin-callout">
        <p>
          Напишите администратору свой никнейм. Он сгенерирует ссылку
          и пришлёт её вам.
        </p>
        <Link to="/contact" className="auth-admin-cta">Связь с админами</Link>
      </div>

      <ol className="auth-steps">
        <li>Напишите администратору свой никнейм.</li>
        <li>Он сгенерирует ссылку в админке и пришлёт её вам.</li>
        <li>Откройте ссылку и задайте новый пароль — она действует 30 минут.</li>
      </ol>

      <p className="auth-hint">
        После смены пароля все активные сессии закрываются: войти можно только с новым.
      </p>

      <div className="auth-links">
        <p><Link to="/login">Вернуться ко входу</Link></p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
