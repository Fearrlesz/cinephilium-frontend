import React from 'react';
import './PrivacyPage.css';

/*
 * Шаблон страницы с политикой обработки данных и cookie.
 * Текст носит технический характер и должен быть проверен юристом
 * перед публичным запуском.
 */
function PrivacyPage() {
  return (
    <main className="container privacy-page">
      <header className="privacy-head">
        <p className="privacy-kicker">Документы</p>
        <h1 className="privacy-title">Данные и cookie</h1>
        <p className="privacy-lead">
          Что мы храним, зачем и как это отключить. Коротко и без юридического тумана.
        </p>
        <nav className="privacy-toc" aria-label="Разделы">
          <a href="#personal-data">Персональные данные</a>
          <a href="#cookies">Cookie</a>
        </nav>
      </header>

      <article className="privacy-doc">
        <section id="personal-data">
          <h2>Обработка персональных данных</h2>
          <p>
            При регистрации мы сохраняем никнейм и хеш пароля (сам пароль не хранится).
            Электронная почта не запрашивается: вход идёт по никнейму, а доступ выдаётся
            инвайт-кодом. Никнейм отображается в профиле и рядом с оценками и рецензиями.
          </p>
          <p>
            Дополнительно фиксируются дата и IP-адрес согласия, чтобы подтвердить его факт и
            защитить сервис от массовых регистраций. Данные не передаются третьим лицам,
            кроме технического подрядчика (хостинг).
          </p>
          <p>
            Аккаунт можно удалить, написав на контактный адрес проекта: данные профиля и
            связанные оценки будут удалены.
          </p>
        </section>

        <section id="cookies">
          <h2>Cookie</h2>
          <p>
            Мы используем только технически необходимые cookie: HttpOnly cookie
            <code> refresh_token</code> держит сессию и обновляет access-токен. Она не доступна
            JavaScript и не используется для рекламы или аналитики.
          </p>
          <p>
            Без этой cookie вход в аккаунт невозможен. Отключить её можно в настройках браузера,
            но тогда сессия не сохранится.
          </p>
        </section>
      </article>
    </main>
  );
}

export default PrivacyPage;
