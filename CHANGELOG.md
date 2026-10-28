# Changelog — Cinephilium Frontend 4.0

**Дата и время среза: 25.10.2026, 21:30 (Europe/Moscow, UTC+03:00)**

## 4.0 — вход без почты и папки страниц

### Вход и регистрация (`src/pages/LoginPage/LoginPage.jsx`)

- Состояний теперь два: `login` и `register`. Экран ввода кода из письма удалён.
- Вход — по никнейму и паролю, без почты.
- Регистрация — никнейм, пароль и инвайт-код от администратора; аккаунт входит сразу,
  токен приходит в ответе `POST /auth/register`.
- Форма спрашивает `GET /auth/config` и, если регистрация открыта, делает поле кода
  необязательным. Подсказка под полем объясняет, где взять код.
- Оба чекбокса согласий сохранены и по-прежнему обязательны.

### Восстановление пароля

- `src/pages/ForgotPasswordPage/ForgotPasswordPage.jsx` больше не отправляет письмо: это страница-инструкция
  «напиши администратору, он выдаст одноразовую ссылку».
- `src/pages/ResetPasswordPage/ResetPasswordPage.jsx` работает как раньше (`/reset-password?token=…`): новый
  пароль, проверка длины и совпадения, отдельный экран для битого токена. Ссылка живёт 30 минут
  и срабатывает один раз.
- Из `src/api/client.js` убраны из списка auth-эндпоинтов удалённые `verify-email`,
  `resend-verification`, `forgot-password`.

### Данные

- `src/pages/PrivacyPage/PrivacyPage.jsx`: почта больше не запрашивается и не хранится, убрано упоминание
  отправки писем.
- `src/pages/ProfilePage/ProfilePage.jsx`: строка с почтой показывается только у старых аккаунтов, где она есть.
- `src/utils/ratingUtils.js`: удалён неиспользуемый `validateEmail`.

### Структура

- Каждая страница переехала в свою папку: `src/pages/<Name>/<Name>.jsx` + `<Name>.css`
  (так уже были устроены `FilmPage` и `CriticPage`).
- Общий для двух страниц `Architect.css` перенесён в `src/styles/`.
- Общий `LoginPage.css` подключается страницами восстановления по относительному пути.
- Все относительные импорты обновлены; проверка `npm run build` — `Compiled successfully`.

### Документация

- README переписан под фактический код: актуальные версии стека, схема архитектуры,
  структура каталогов, маршруты, API-клиент и обновление токена, авторизация, постеры,
  локальный запуск, переменные окружения, деплой и известный техдолг (28.10.2026).

---

# Changelog — Cinephilium Frontend 3.0

**Дата и время среза: 25.10.2026, 14:23 (Europe/Moscow, UTC+03:00)**

Полное описание изменений бэкенда и обоснование решений — в
[CHANGELOG.md бэкенда](https://github.com/Fearrlesz/cinephilium-backend/blob/main/CHANGELOG.md).
Здесь — только фронтенд.

---

## 1. API-клиент (`src/api/client.js`)

**Было:** один `token` в localStorage, без обновления, 401 → сразу редирект на `/login`.
**Стало:**

- `baseURL` из `REACT_APP_API_URL` (фолбэк — текущий onrender-адрес);
- `withCredentials: true` — иначе браузер не отправит HttpOnly refresh-cookie;
- access-токен в `accessToken`; дополнительно дублируется в старый ключ `token`,
  чтобы не переписывать 20 проверок в компонентах;
- на 401 — single-flight `POST /auth/refresh` и один ретрай исходного запроса;
  если refresh не удался — сессия чистится и пользователь уходит на `/login`;
- ошибки бэкенда `{ error: { code, message } }` нормализуются в строку, поэтому все
  существующие `err.response?.data?.error` продолжают работать;
- `logout()` отзывает сессию на сервере и только потом чистит локальное состояние.

## 2. Вход и регистрация (`src/pages/LoginPage.jsx`)

- Три состояния: `login`, `register`, `verify`.
- Логин сохраняет `accessToken` (раньше читал несуществующий `token`).
- Регистрация больше не ждёт токен: показывается экран ввода 6-значного кода из письма,
  кнопка «Отправить код ещё раз» вызывает `/auth/resend-verification`.
- Пароль — минимум 8 символов (синхронно с бэкендом).
- Два обязательных чекбокса: обработка персональных данных и cookie. Без них форма не уходит,
  а согласия отправляются в API вместе с регистрацией.

## 3. Сброс пароля

- `src/pages/ForgotPasswordPage.jsx` (`/forgot-password`) — email → `POST /auth/forgot-password`,
  всегда нейтральное сообщение об отправке.
- `src/pages/ResetPasswordPage.jsx` (`/reset-password?token=…`) — новый пароль + подтверждение,
  проверка длины и совпадения, отдельный экран для отсутствующего/битого токена.
- Ссылка «Забыли пароль?» на странице входа.

## 4. Согласия и политика

- `src/pages/PrivacyPage.jsx` (`/privacy`) — что собираем, зачем, какие cookie используем.
  Текст — шаблон, требует юридической вычитки.
- Стили чекбоксов — `src/pages/LoginPage.css` (`.consent-check`).

## 5. Совместимость с API v3

| Файл | Что изменилось |
|---|---|
| `src/pages/TopUsersPage.jsx` | формат `{ items, pagination }`, статистика из `counters` |
| `src/pages/ProfilePage.jsx` | достижения из `earned`/`possible`, выход через серверный `logout` |
| `src/pages/HomePage.jsx` | выход через серверный `logout` |
| `src/hooks/useActivityEvents.js` | лента только читается; убраны `POST /events` и `DELETE /events/:id` (их нет в API, а события создаёт бэкенд) |
| `src/pages/FilmPage/hooks/useRatingForm.js` | текст ошибки через `getErrorMessage` |
| `src/utils/apiError.js` | новый разбор формата ошибок |
| `src/utils/ratingUtils.js` | минимальная длина пароля 8 |
| `.gitignore` | добавлен: до этого `node_modules` и `build` попадали в git |

## 6. Проверки

- `npm run build` → `Compiled successfully` (CRA 5, React 18).
- Автотестов на фронте нет — это ограничение, которое стоит закрыть (Vitest/RTL).

## 7. Деплой

На Vercel задать:

```
REACT_APP_API_URL=https://<бэкенд>/api
```

Домен фронтенда должен быть указан в `CORS_ORIGIN` и `CLIENT_URL` на бэкенде — иначе CORS
заблокирует запросы, а ссылка из письма «забыли пароль» приведёт не туда.
