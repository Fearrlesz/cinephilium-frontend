# Контекст фронтенда Cinephilium

**Дата среза:** 03.11.2026
**Ветка:** `main`  
**Репозиторий:** https://github.com/Fearrlesz/cinephilium-frontend  
**Бэкенд:** https://github.com/Fearrlesz/cinephilium-backend  
**Документация версии:** `CHANGELOG.md` (4.10.0)
**Дизайн-хендофф:** `DESIGN_HANDOFF.md` — палитра, типографика, компоненты,
точные значения из `tokens.css`.

Это рабочая карта фронтенда: как он устроен, что уже сделано в F1–F9,
какие решения зафиксированы и что нельзя сломать. Это не README: корневой `README.md` —
витрина проекта, а не инструкция по разработке.

---

## 1. Что это за проект

Cinephilium — сайт, где фильмы оценивают не одной цифрой, а 15 критериями в 5 блоках
плюс субъективным «вайбом». Из критериев считается технический балл, из него и вайба —
комбинированный.

- Фронтенд: React 18, Create React App 5, React Router 6, axios, кастомный CSS.
- Бэкенд: Node.js + Express 5 + MongoDB, отдельный репозиторий.
- Прод: Vercel (фронт), Render (API), MongoDB Atlas.
- Регистрация — по инвайт-коду, без почты и SMTP.

---

## 2. Запуск и сборка

```bash
npm install
npm start          # CRA dev server, по умолчанию http://localhost:3000
npm run build      # production-сборка
```

API задаётся переменной окружения:

```bash
REACT_APP_API_URL=http://127.0.0.1:3000/api npm start
```

Если переменная не задана, `src/api/client.js` использует прод-адрес
`https://cinephilium-backend.onrender.com/api`. Для локальной проверки всегда
выставляй `REACT_APP_API_URL` явно.

Автотестов нет. Проверка изменений — `npm run build` плюс ручные сценарии в браузере.
Для UI-прогонов удобно поднимать локальный бэкенд на отдельном порту и смотреть
страницу фильма в реальном Chrome.

---

## 3. Структура

```
src/
  api/                 client.js, films.js, critics.js
  components/          <Name>/<Name>.jsx: Header, NotificationModal, ActivityFeed,
                       RatingDetailsModal, CustomSelect, ProfileGalleries,
                       ProfileDiary; Critic/<Name>/<Name>.jsx
  context/             NotificationContext
  hooks/               useActivityEvents, useCriticData
  pages/
    FilmPage/          страница фильма: оценка, рецензии, комментарии
    HomePage/          каталог
    ProfilePage/       свой профиль
    UserProfilePage/   чужой профиль
    LoginPage/, ForgotPasswordPage/, ResetPasswordPage/
    AdminPanel/, ContactPage/, CriticPage/, TopUsersPage/, AboutPage/, PrivacyPage/
  styles/              tokens.css, base.css, typography.css (слой F-DESIGN-1),
                       Architect.css (общий для нескольких страниц)
  utils/               constants, scoring, apiError, posterUrl, ratingUtils, mockCriticData
  App.js               маршруты
  App.css              legacy-токены и стили старых страниц/F1
```

Страницы лежат в папках `<Name>/<Name>.jsx` + `<Name>.css`; компоненты —
в одноимённых папках `<Name>/<Name>.jsx` (+ `<Name>.css`), страничные компоненты
FilmPage — в `components/<Name>/`, хуки — в `hooks/`.

---

## 4. API-клиент (`src/api/client.js`)

- `baseURL` — `REACT_APP_API_URL` или прод-фолбэк.
- Access-токен: `localStorage.accessToken`, дублируется в старый ключ `token`.
- `withCredentials: true` — HttpOnly refresh-cookie.
- На 401 — single-flight `POST /auth/refresh` и один ретрай; при неудаче сессия
  чистится и происходит переход на `/login`.
- Ошибка бэкенда `{ error: { code, message, details } }` нормализуется:
  - `data.error` становится строкой (старый UI читает её как текст);
  - `data.errorDetails` — исходный `details`;
  - `data.errorCode` — машинный `code` (добавлено в F1-fix одной строкой).
- `client.js` не переписывать. Допустимы точечные добавления, не меняющие поведение.

Хелпер `getErrorMessage(error, fallback)` в `src/utils/apiError.js` умеет читать
и новый, и старый формат ошибок.

---

## 5. Страница фильма и блок оценки (F1)

Главная точка изменений F1 — `src/pages/FilmPage/`.

```
FilmPage.jsx
  FilmInfo/FilmInfo.jsx        постер, заголовок, описание, мета
  RatingSection/RatingSection.jsx  контейнер: соцдоказательство + панель + модалка
    RatingContext/RatingContext.jsx  «Сообщество / Ваша / delta»
    RatingPanel/RatingPanel.jsx      три колонки
      VibeTrack/VibeTrack.jsx        drag-трек / 10 сегментов
    CriteriaModal/CriteriaModal.jsx  модалка полной оценки
      RatingForm/RatingForm.jsx      жанр, веса, аккордеон, preview, save
  FilmActions/FilmActions.jsx  сердечко + watchlist (F5/F6) + «Просмотрено» (F4)
    WatchAction/WatchAction.jsx  кнопка и модалка просмотра
    WatchModal/WatchModal.jsx    дата, пересмотр, теги
  UsersList/UsersList.jsx      «Оценили фильм»
  ReviewsSection/ReviewsSection.jsx
  CommentsSection/CommentsSection.jsx
```

Хуки:

- `useFilmData.js` — загрузка фильма, пользователей, комментариев, рецензий,
  текущего пользователя. `loadFilm({ silent: true })` обновляет агрегаты без
  экрана «Загрузка...».
- `useVibeRating.js` — vibe-only сохранение, локальное значение, 429-лок,
  откат при ошибке, обновление списка оценок.
- `useRatingForm.js` — черновик полной оценки для модалки: scores, vibe, жанр,
  веса, preview, отправка full-payload.
- `usePointerCoarse.js` — `(pointer: coarse)` для выбора сегментов вместо drag.

### Три состояния

- **Нет оценки:** вайб `—`, технический `—`, комбинированный `—`; трек активен;
  CTA «Оценить».
- **Vibe-only:** вайб `N / 10` + слово; технический `—`; комбинированный `—`;
  CTA «Оценить» акцентная; «Ваша» в соцдоказательстве `—`, delta пусто.
- **Full:** вайб, технический с буквой и спектром, комбинированный из
  `combinedScore`; формула; «Изменить критерии →»; трек вайба read-only.

### Зафиксированные решения F1

- **1C** — drag на `pointer: fine`, 10 сегментов на `pointer: coarse`.
  Ширина окна не используется: планшет с мышью остаётся drag.
- **2A** — клик по уже выставленному вайбу — no-op. На бэкенде нет DELETE оценки,
  `vibe: 0` невалиден; фальшивый сброс не показываем.
- **3** — в тихой справке колонок показываем **средние** сообщества
  (`averageVibe`, `averageTechnical`, `averageCombined`), а не количество людей.
- **4A** — в соцдоказательстве только комбинированный балл.
- **5A** — `useVibeRating` + `VibeTrack`, `CriteriaModal` + `RatingForm`,
  `RatingSection`-контейнер. Старый `useRatingForm` переписан под черновик модалки.
- **6A** — full read-only в панели; изменения vibe и критериев — только в модалке
  одним full-payload. Причина: бэкенд отвечает `ALREADY_FULL_RATING` на vibe-only
  для уже полной оценки.
- **7A** — сумма весов строго 100: сохранение блокируется, без тихой нормализации.
- **F1-fix** — combined и technical существуют **только для full**. Vibe-only:
  оба прочерка, никакого `vibe × 10` и «на основе вайба».
- «Ваша» в соцдоказательстве — только full. Delta — только когда есть и
  «Сообщество», и «Ваша».
- Preview в модалке считается на фронте и нужен только до сохранения. После
  сохранения панель берёт `combinedScore` из БД. Preview использует ту же формулу,
  что бэкенд: простое среднее по критериям внутри блока, затем веса блоков.
- `scifi_author` в `constants.js` — `[20,20,25,15,20]`, как на бэкенде
  (раньше было `[25,20,20,15,20]`).

### Ошибки оценки

- `400 ALREADY_FULL_RATING` — полная оценка уже стоит; UI не даёт отправить
  vibe-only для full. Ловится по `errorCode` (fallback — текст).
- `429 VIBE_LIMIT_REACHED` — лимит 50 vibe за сутки; `errorDetails.retryAt`,
  трек блокируется до этого времени.
- `400 VALIDATION_ERROR` — сообщение из `errorDetails`, field-errors под критериями;
  форма не сбрасывается.

### F2 — гейтинг комментариев (закрыт)

- `CommentsSection` имеет три состояния: неавторизован → «Войдите, чтобы
  комментировать» + ссылка `/login`; авторизован без Rating → «Чтобы
  комментировать, оцените фильм» + CTA «Оценить» (скролл к `.rating-section`);
  авторизован с любой оценкой (vibe или full) → форма.
- Гейт читает `film.userRating`; после сохранения vibe он обновляется через
  существующий `reloadFilm({ silent: true })`, форма разблокируется без reload.
  `RatingSection`, `useVibeRating`, `useRatingForm` не менялись.
- `403 RATING_REQUIRED_FOR_COMMENT` ловится по `errorCode`. `FilmPage.addComment`
  возвращает `{ ok, code, message }`; `CommentsSection` ждёт результат, показывает
  inline-сообщение над формой и не теряет введённый текст.
- Лайк комментария не гейтится: `POST /comments/:id/like` работает без оценки.
- Зафиксировано: **F2/1A, 2A, 3B, 4A, 5A, 6A**; B3/2A (weight 0 не блокирует),
  B3/3B (админ не exempt), B3/4A+4C (`userRating` — подсказка, 403 — гейт),
  B3/5A (`POST /ratings` → `POST /comments`, без ретраев).
- Проверка: production-сборка + mock API + Chrome headless, 22/22 сценария;
  скриншоты — `screenshots/f2-comments/`. Живой прод-прогон не выполнялся:
  Vercel preview закрыт Vercel Authentication, Render из среды недоступен.

### F3 — рецензии: full + spoiler (закрыт)

- `ReviewsSection` имеет три состояния: неавторизован → «Войдите, чтобы написать
  рецензию» + `/login`; авторизован без **полной** оценки (нет оценки или только
  vibe) → «Рецензия доступна после полной оценки — 15 критериев» + CTA «Оценить
  подробно»; авторизован с full → кнопка «Написать рецензию» и форма.
- CTA открывает `CriteriaModal`. Чтобы не трогать `RatingSection`, в
  `ReviewsSection` рендерится второй экземпляр того же компонента; после сохранения
  `handleRatingSaved` делает `setUserRating` + `reloadFilm({ silent: true })` +
  `loadFilmUsers()`, поэтому гейт снимается без перезагрузки.
- Чекбокс «Содержит спойлеры» → `isSpoiler: true` в теле
  `POST /api/reviews`. `ratingId` больше **не отправляется**: по B4 сервер сам
  берёт Rating пользователя.
- В списке при `isSpoiler: true` скрыто только тело; заголовок, автор, дата,
  оценка и лайки видны. Плашка «Спойлер» — toggle «Показать» / «Скрыть»,
  состояние локальное, без персиста.
- `403 FULL_RATING_REQUIRED_FOR_REVIEW` ловится по `errorCode`: inline-гейт над
  формой, текст и чекбокс сохраняются.
- Длина: минимум **350** (бэкенд; по решению B продублирован в форме),
  максимум **15000** (и фронт, и бэкенд; `MAX_TEXT = 15000`).
- Зафиксировано: **F3/1A, 2A, 3A, 4A, 5B, 6A, 7**; `API-CONTRACT.md` приведён
  к фактическому телу запроса.
- Проверка: production-сборка + mock API + Chrome headless, 29/29 сценариев;
  скриншоты — `screenshots/f3-reviews/`. Живой прод-прогон — `[UNVERIFIED]`
  по той же причине, что F2.

### F5/F6 — сердечко и watchlist, галереи профиля (закрыт)

- `FilmActions` стоит в `FilmInfo` сразу под `RatingSection`: сердечко с
  `likesCount` и кнопка «Хочу посмотреть» / «В списке». Лайк — `liked/likesCount`
  из `GET /api/films/:id`, переключается `POST` / `DELETE /api/films/:id/like`.
  Watchlist при загрузке проверяется отдельно: `GET /api/watchlist/check/:filmId`
  (в фильме нет `inWatchlist`), добавление — `POST /api/watchlist { filmId }`.
- У `DELETE /api/watchlist/:id` параметр — `_id` записи WatchlistItem, а не
  `filmId`. Поэтому удаление ищет запись через `GET /api/watchlist/user`
  (постранично, limit 100) и вызывает DELETE с её `_id`.
- Кнопки оптимистичные: значение и счётчик меняются сразу, при ошибке — откат и
  inline-сообщение на 4 секунды. Без авторизации клик ведёт на `/login`.
- «Просмотрено» стало функциональным в F4 (см. ниже); лайк и watchlist
  по-прежнему не гейтятся ни оценкой, ни ролью.
- `ProfileGalleries` на своём и чужом профиле, до старых вкладок:
  «Понравившиеся» — `GET /api/users/me/likes` (свой) или
  `GET /api/users/:id/likes` (чужой); «Хочу посмотреть» —
  `GET /api/watchlist/user` или `GET /api/users/:id/watchlist`. Конверт —
  `{ items, pagination }`, по 12 на страницу.
- Сетка 6/5/4/3/2 колонок; на desktop имя и год — в hover-оверлее поверх
  градиента, на мобиле — всегда под постером. Крестик удаления — только у своего
  watchlist; на desktop появляется по hover, на touch виден всегда. Удаление
  оптимистичное, ошибка откатывается. Пустые секции — CTA «Найти фильмы».
  Для скрытого профиля галереи не рендерятся (404 личных разделов).
- Счётчики `counters.filmLikes` / `counters.watchlist` выводятся в шапке профиля
  и обновляются после удаления из watchlist через `onWatchlistRemoved`; счётчик
  секции меняется оптимистично.
- Зафиксировано: **F5+F6/1B, 2A, 3A, 4B, 5A, 6A, 7A, 8A, 9A, 10A, 11A**.
  F1/F2/F3-компоненты не менялись; вкладки профиля B9 тогда не трогались — их
  адаптация сделана в F8.
- Проверка: production-сборка + mock API + Chrome headless, 19/19 сценариев;
  скриншоты — `screenshots/f5-f6/`. Живой прод-прогон — `[UNVERIFIED]`.

### F4 — дневник просмотров (закрыт)

- Кнопка «Просмотрено» в `FilmActions` больше не disabled: она открывает
  `WatchModal` с датой (по умолчанию сегодня), чекбоксом «Повторный просмотр» и
  тегами через запятую. Пустая и будущая дата проверяются на клиенте, ошибка
  показывается inline; серверные 400 также inline, поля не теряются.
- `POST /api/watches` — тело `{ filmId, watchedAt, isRewatch, tags }`; успех
  `201`. Теги: до 10, каждый до 30 символов, дубликаты без учёта регистра
  схлопываются на клиенте. После успеха модалка закрывается, кнопка становится
  активной, счётчик увеличивается оптимистично.
- Счётчик рядом с кнопкой — `film.watchesCount` из `GET /api/films/:id`
  (`// DECISION: F4/2C`, отдельный `/watches/:filmId/count` не нужен).
- Признака «я смотрел» в фильме нет. `WatchAction` при загрузке листает
  `GET /api/watches/me?page&limit=100`, пока не найдёт `filmId`; это осознанный
  обход отсутствующего per-film флага (`// DECISION`). При большом дневнике это
  несколько запросов; кнопка disabled, пока проверка не закончилась.
- `ProfileDiary` — отдельная секция после `ProfileGalleries`, до старых вкладок:
  свой профиль `GET /api/watches/me`, чужой `GET /api/users/:id/watches`;
  конверт `{ items, pagination }`, по 10 на страницу, «Загрузить ещё».
  Скрытый профиль (`404 PROFILE_HIDDEN`) не рендерит секцию; закрытый дневник
  (`403 DIARY_PRIVATE`) показывает «Пользователь закрыл свой дневник просмотров».
- Записи группируются по месяцу (`// DECISION: F4/5A`); карточка — постер 2/3,
  название и год, дата, нейтральная плашка «Пересмотр», теги, ссылки на оценку
  и рецензию. Удаление — только у своего профиля, по hover на desktop и всегда
  на touch (`// DECISION: F4/8A`); `DELETE /api/watches/:id` по `_id` записи,
  оптимистично, с откатом при ошибке.
- После удаления `ProfileDiary` перечитывает уже открытые страницы: иначе
  offset-пагинация сдвигается и «Загрузить ещё» пропускает запись. На время
  удаления кнопка «Загрузить ещё» скрыта, чтобы не было гонки.
- Зафиксировано: **F4/1A, 2C, 3A, 4A, 5A, 6A, 7A, 8A, 9A, 10A**. Watch не создаёт
  Rating/Review автоматически (`F4/10A`); вкладки профиля не трогались.
- Проверка: production-сборка + mock API + Chrome headless, 40/40 сценариев;
  скриншоты — `screenshots/f4-diary/`. Живой прод-прогон — `[UNVERIFIED]`.

### F7 — комментарии к рецензиям (закрыт)

- Отдельной `ReviewPage` в коде нет, поэтому блок inline: внутри каждой
  `<article className="rev">` после оценки и спойлер-плашки. `ReviewsSection`
  рендерит `<CommentsSection targetType="review" targetId={review._id} />`;
  F3-гейт и spoiler-логика не тронуты.
- `CommentsSection` сохраняет режим фильма (F2) и получает режим рецензии через
  пропсы `targetType` / `targetId`. В режиме фильма по-прежнему родитель передаёт
  `comments` и колбэки, используется старый `GET /api/comments/:filmId`; старый
  рендер и гейт не менялись.
- В режиме рецензии компонент сам грузит данные: счётчик — `GET /api/comments?
  targetType=review&targetId=...&limit=1` → `pagination.total`; раскрытие — страница
  по 5 корневых комментариев, «Загрузить ещё» — следующая страница. После отправки
  перечитываются уже открытые страницы, чтобы новый комментарий не сдвинул список.
- Блок свёрнут до кнопки «N комментариев»; клик раскрывает список и форму.
  Форма — под списком, как в F2. Неавторизованному вместо формы показывается
  «Войдите, чтобы комментировать» + `/login`; список остаётся видимым.
- Комментарий к рецензии **не гейтится** `userRating`: можно писать без оценки
  фильма. `POST /api/comments` получает `{ targetType: 'review', targetId, text }`,
  для ответа добавляется `parentId`. Один уровень ответов: у вложенного ответа нет
  кнопки «Ответить». Лайк — `POST /api/comments/:id/like`.
- Pending не фильтруется на клиенте: сервер отдаёт approved всем, плюс свои pending
  автору и всё админу. Свой pending помечен «На модерации — видно только вам».
  Пустое состояние — «Пока никто не комментировал» + форма.
- Зафиксировано: **F7/1** inline, **F7/2** свёрнутый блок, **F7/3** переиспользование
  пропсами + query/POST, **F7/4** один уровень, **F7/5** видимость на сервере,
  **F7/6** без гейта по оценке. Отдельный маршрут рецензии не создавался.
- Проверка: production-сборка + mock API + Chrome headless, 16/16 сценариев
  (свёрнуто/раскрыто, пост без оценки и с оценкой, pending автора/чужого,
  ответ, лайк, пусто, пагинация, режим фильма, 480/620/768/1024); скриншоты —
  `screenshots/f7-review-comments/`. Живой прод-прогон — `[UNVERIFIED]`.

### Связь с админами в auth (4.7.1)

- `LoginPage`: внутри формы, сразу под паролем, ссылка «Связь с админами» →
  `/contact`; ссылка «Забыли пароль?» сохранена. Неавторизованному не нужно
  угадывать, куда писать.
- `ForgotPasswordPage`: блок «Кому писать» и CTA «Связь с админами»; текст прямо
  говорит, что ссылку на сброс выдаёт администратор, а живые Telegram-контакты —
  на `/contact`.
- `Header`: пункт навигации переименован в «Связь с админами» и выделен
  azure-пилюлей. На 1025+ — полный текст, на 769–1024 — «Админы», на ≤768
  навигация скрыта, но в tools остаётся компактная ссылка «Админы».
- Новых эндпоинтов нет: используется существующая `ContactPage` с
  `GET /api/contact/admins`. Новые hex, шрифты и брейкпоинты не добавлялись;
  только токены `--azure*`, `--ink-*`, `--r-sm`.
- Проверка: mock API + Chrome headless, 36/36 сценариев (ссылки в форме и на
  forgot-password, переход на `/contact`, загрузка админов, шапка 1440/1024/860/768/480,
  валидный и невалидный вход, отсутствие горизонтального overflow); скриншоты —
  `screenshots/login-admin/`.

### F8 — вкладки профиля и плоский дизайн (закрыт)

- Карточка профиля компактная: аватар-инициал, ник, дата регистрации, шесть
  счётчиков (`ratings+vibes`, `reviewsApproved`, `commentsApproved`, `watches`,
  `watchlist`, `filmLikes`), `pinnedAchievement` (одно значение) и
  `achievementsCount`. В 4.9 disabled-кнопка «Редактировать» заменена на
  «Настройки» с inline-панелью приватности (см. F9); страницы редактирования
  профиля по-прежнему нет.
- Семь вкладок в порядке: Оценки, Рецензии, Комментарии, Дневник, Watchlist,
  Понравившиеся, Достижения. Активная вкладка — `?tab=<key>`, default `ratings`;
  переключение через `useSearchParams`, браузерный «назад» восстанавливает вкладку.
- Оценки сортируются на сервере: `?sort=new|old|high|low` (по умолчанию `new`).
  Над сеткой — текстовые «Новые / Старые / Высокие / Низкие»; при смене сортировки
  список начинается с первой страницы. `high/low` идут по `combinedScore`, vibe
  без балла всегда после full-оценок. См. `RatingsTab` и `listRatings`.
- Каждая вкладка грузит свой эндпоинт и имеет собственные skeleton/empty/error/
  «Загрузить ещё». Оценки — `/users/:id/ratings` (12), рецензии —
  `/users/:id/reviews` (10), комментарии — `/users/:id/comments` (15), дневник —
  `/users/:id/watches` (10, `ProfileDiary embedded`), watchlist/лайки —
  `/users/:id/watchlist|likes` (12, `PosterGallerySection hideHead`), достижения —
  `/users/:id/achievements`.
- Свои вкладки идут через `:id = currentUser._id`; отдельные `/me/ratings` и т.п.
  на фронте не создавались. `ProfilePage` получает себя через `/auth/me` и передаёт
  `initialUser`; `UserProfilePage` при наличии токена тоже грузит `/auth/me`,
  иначе работает по `:id`.
- Закрепление: только своё; `PUT /users/me/pinned-achievement`
  `{ achievement: string | null }`. После успеха карточка обновляется, старое
  значение заменяется; `400 ACHIEVEMENT_NOT_EARNED` показывается inline.
- Приватность: скрытый профиль отдаёт `{ user: hiddenProfileStub }`; карточка
  показывает заглушку (ник/аватар/`isHidden`), вкладки не рендерятся. 404 вкладок
  скрывает секцию, `403 DIARY_PRIVATE` показывает сообщение.
- Плоский дизайн только профиля: `ProfilePage.css` переписан на токены; убраны
  `box-shadow`, `backdrop-filter`, многослойные тени, `translate/scale` на hover,
  анимации появления и transitions >0.16s. Разделители — `border`/`line-faint`,
  поверхности — `void`/`surface`, hover — только цвет. Компоненты F4/F5+F6
  переиспользованы, их поведение не менялось. `Architect.css` (золотая тема)
  больше не импортируется профилем.
- Зафиксировано: **F8/1A** карточка + вкладки; **F8/2A** порядок и `?tab=`;
  **F8/3A** свои вкладки через `:id`; **F8/4A** одно закреплённое достижение;
  **F8/5A** плоский дизайн только профиля; **F8/6A** переиспользование F4/F5+F6/F7.
- Проверка: production-сборка + mock API + Chrome headless, 47/47 сценариев
  (карточка, все семь вкладок, pinned/unpin, пагинация, удаление, приватность,
  пусто/ошибка, URL/back, 480/620/768/1024, плоские computed styles); скриншоты —
  `screenshots/f8-profile/`. Живой прод-прогон — `[UNVERIFIED]`.

### F9 — каталог, глобальная навигация и плоский редизайн (закрыт)

- **Каталог отдельно от Home.** `/` — редакционная главная: заголовок, поиск,
  топ-5, «Новые в каталоге» (10), лента событий и CTA «Весь каталог». Полная
  сетка снята с главной. `/catalog` — вся библиотека: поиск, фильтры, сортировка,
  активные чипы, сетка 5/4/3/2, «Загрузить ещё», пусто/ошибка.
- **Поиск не отдельная страница.** Поиск встроен в каталог; header-иконка ведёт
  на `/catalog?focus=search`. TMDB-добавление — плоская модалка внутри каталога.
  После импорта (нового или `alreadyExists`) сразу `navigate('/film/:id')`;
  фронтовый дубль `film_add` удалён, единственное событие создаёт бэкенд.
- **URL — состояние каталога:** `?q=&genre=&yearFrom=&yearTo=&rated=&sort=&page=`.
  `sort`: `technical|vibe|combined|new|title`; `rated`: `with|without`
  (`1|0` тоже принимаются). Страница и фильтры восстанавливаются по Back.
- **Backend-фильтры.** `GET /api/films` принимает `q` (regex по title,
  экранированный), `genre` (Film.genres), `yearFrom/yearTo`, `rated`,
  `sort`, `page`, `limit`; `pagination.total` считается после фильтров.
  `GET /api/films/facets` → `{ genres: [{value,count}], years: {min,max} }`;
  объявлен до `/:id`.
- **Навигация.** `src/components/Header/Header.jsx` — самостоятельный: сам грузит
  `/auth/me`, сам разлогинивает; пункты Каталог, Архитектор, Топ, О системе;
  справа поиск, «Связь с админами», аватар/вход. `SiteLayout` рендерит Header +
  `Outlet`; публичные маршруты — под ним, auth-страницы — минимальный `AuthLayout`,
  `/admin` — отдельно. Публичные «← На главную» удалены.
- **Auth.** `AuthLayout` — две колонки на десктопе (редакционный aside + форма),
  одна на ≤860; подчёркнутые поля, azure-кнопка, inline-ошибки. `/register` —
  отдельный маршрут `<LoginPage initialStage="register" />`. Стадия берётся из
  prop на каждом рендере (`const stage = initialStage`), а не из
  `useState(initialStage)`: React Router переиспользует тот же `LoginPage` при
  переходе `/login ↔ /register`, иначе форма остаётся в старом состоянии.
  Ключи маршрутов `login/register` дополнительно сбрасывают поля.
- **Инвайт-код.** Поле «Инвайт-код» есть только в стадии регистрации сразу под
  паролем; обязательно, если `GET /auth/config` вернул `inviteRequired: true`.
  Код выдаёт администратор, ссылка «Связь с админами» ведёт на `/contact`.
  Согласия на персональные данные и cookie — там же, обязательны.
- **Ответы на рецензию.** В F7-блоке под рецензией подпись — «Ответы на
  рецензию» / «Ответы на рецензию · N» и в свёрнутом, и в раскрытом состоянии;
  пустое состояние — «Пока нет ответов на рецензию».
- **Приватность профиля.** «Настройки» на своей карточке открывает inline-панель:
  `GET /users/me/privacy`, переключатели `hideProfile`/`hideFromFeed`,
  оптимистичный `PUT /users/me/privacy` с откатом при ошибке. Свой скрытый
  профиль владелец видит; другим отдаётся stub и вкладки не рендерятся.
- **Плоский язык.** Только токены: без `box-shadow`, `backdrop-filter`, glow,
  градиентных заливок, `translate/scale` на hover и декоративных анимаций;
  transitions только цвет/прозрачность 0.12–0.16s; радиусы 0–6px; сетка 1180.
  Заголовки страниц — Instrument Serif, служебные подписи — IBM Plex Mono,
  интерфейс — Inter. Azure — действие/активное, cyan — значения.
- **Страницы 4.9.** About — редакционная статья с блоками 01–05; TopUsers —
  таблица-лидерборд (топ-3 azure, без медалей); Privacy — документ с якорями;
  Contact — две колонки (админы + заявка); Admin — плотный служебный layout,
  нейтральные кнопки отклонения.
- **Проверка:** production build `Compiled successfully`
  (126.64 kB JS / 21.76 kB CSS); mock API + Chrome 46/46 сценариев: импорт-редирект,
  header desktop/mobile, каталог (фильтры/фасеты/поиск/добавление/URL/Back),
  Home, auth 1440/480, приватность профиля, About/Privacy/Contact/Top/Admin,
  адаптив 480/620/768/1024, отсутствие horizontal overflow. Живой прод —
  `[UNVERIFIED]`. Скриншоты — `screenshots/design-mopup/`.
- **4.9.1 (auth/review-label hotfix).** `/login` → `/register` больше не
  застревает в login: стадия читается из prop, маршруты получили `key`.
  Инвайт-код и согласия появляются на `/register`; POST `/auth/register`
  получает `{nickname,password,inviteCode,consent}`. Подпись F7-блока —
  «Ответы на рецензию». Mock API + Chrome: 12/12 (переход, поля, payload
  с инвайтом, collapsed/expanded label); production build 126.69/21.84.

### F10 — отмена вайба и его видимость (закрыт)

- **Отмена только вайба.** `DELETE /api/ratings/:id` удаляет vibe-оценку
  владельца, её `Action` и событие `vibe`, отвязывает `Watch.ratingId`,
  уменьшает `counters.vibes` на 1 и снимает 2 балла. Полную оценку отменить
  нельзя: `400 FULL_RATING_CANNOT_BE_CANCELLED`; чужая — `404 NOT_FOUND`.
  В UI кнопка «Отменить вайб» показывается только для vibe-only и
  авторизованного пользователя.
- **Вайб не прочерк.** В технической и комбинированной колонках при vibe-only
  крупно выводится `вайб N` с `/ 10` и подписью «технический/комбинированный
  не вычислен». В «Ваш вайб» — `N / 10`. В списке оценивших, в карточке оценки
  профиля, в модалке деталей и в контексте — тоже `вайб N`. Технический и
  комбинированный баллы не доизобретаются.
- **Событие.** `ActivityFeed` знает тип `vibe`: «поставил вайб … — N/10»;
  бэкенд хранит `metadata.vibe`, `score` остаётся `null`. При отмене событие
  удаляется.
- **Проверка:** backend `node --test tests/vibe-rating.test.js` → 17/17;
  frontend production build 127.68 kB JS / 22.03 kB CSS; mock API + Chrome
  11/11: лента, три колонки, список оценивших, профиль, отмена, удаление
  события, 480 без overflow. Скриншоты — `screenshots/vibe-cancel/`.
  Живой прод — `[UNVERIFIED]`.

---

## 6. Контракт бэкенда (фактический)

`GET /api/films/:id`:

```
averageVibe, averageTechnical, averageCombined,
votesCount, vibesCount, fullCount,
userRating: {
  completeness: 'vibe' | 'full',
  vibe, technicalScore, combinedScore,
  scores, genrePreset, blockWeights
}
```

Важно:

- На странице фильма отсутствующие средние приходят `0`, а не `null` (B2/6.1).
  Поэтому «—» включается по счётчику: `fullCount === 0` / `votesCount === 0`,
  а не по нулю.
- `votesCount` — все оценки (vibe + full), `vibesCount` — только vibe,
  `fullCount` — только full.
- Vibe-only: `technicalScore: 0`, `combinedScore: 0` — маркеры «не вычислено».
  Фронт не должен их доизобретать.
- Комбинированный: `tech × 0.7 + vibe × 3` (vibe 1–10).

`POST /api/ratings`:

- `{ filmId, vibe }` — vibe-only, `201`, `completeness: 'vibe'`, оба балла `0`.
- `{ filmId, vibe, scores, genrePreset?, blockWeights?, textReview? }` — full,
  `201`, `completeness: 'full'`; апгрейд vibe → full тем же payload.
- Ключи `scores` брать только из `src/config/scoring.js` бэкенда:
  `scenario {plot, ideas, dialogue}`, `characters {depth, chemistry, functionality}`,
  `visual {composition, cinematography, pacing, tone}`, `sound {music, design, narrative}`,
  `style {originality, boldness}`.
- `blockWeights` — массив 5 чисел, сумма ровно 100. `genrePreset: 'hybrid'`
  означает «ручные веса», бэкенд берёт `blockWeights`.

`DELETE /api/ratings/:id`:

- только владелец и только `completeness: 'vibe'`;
- удаляет `Rating`, `Action` типа `rating`, `Event` типа `vibe` с
  `contentId = ratingId`, отвязывает `Watch.ratingId`;
- `counters.vibes -1`, `totalPoints -2`; ответ `{ deleted: true, filmId }`;
- full → `400 FULL_RATING_CANNOT_BE_CANCELLED`, чужая/нет → `404 NOT_FOUND`.

`GET /api/events`:

- тип `vibe` уже существует; для него `metadata.vibe` — значение 1–10,
  `score` равен `null`. Фронт читает `metadata.vibe ?? score` и не показывает
  generic «сделал что-то с фильмом».

`GET /api/films/:id/users`:

- отдаёт `rating.completeness`, `technicalScore`, `combinedScore`, `finalScore`;
- для vibe-only `finalScore: 0` — **известное ограничение бэкенда**. Фронт скрывает
  цифру, если `completeness === 'vibe'`; правильный фикс — на бэкенде.

`POST /api/comments`:

- Фронт F2 отправляет `{ filmId, text }`; B8 считает отсутствие `targetType`
  комментарием к фильму и берёт `targetId` из `targetId ?? filmId`.
- F7 отправляет `{ targetType: 'review', targetId, text, parentId? }`; для
  рецензии Rating не требуется — это обсуждение текста (B8).
- Для фильма без Rating — `403 RATING_REQUIRED_FOR_COMMENT`; для неопубликованной
  рецензии — `404` посторонним или `403 REVIEW_NOT_PUBLISHED` автору/админу.
- `parentId` — только на опубликованный корень, один уровень; текст до 1000.
- Новый комментарий создаётся `pending`; лайки не гейтятся.

`GET /api/comments?targetType=film|review&targetId=&page=&limit=`:

- `{ items, pagination }`; каждый корень содержит `replies[]` (один уровень).
- `targetType` обязателен; без него `400`.
- Видимость: `approved` всем, свои `pending` автору, всё админу.
- Старый `GET /api/comments/:filmId` — массив только для фильма, с `replies[]`.

`GET /api/reviews/:filmId`:

- массив рецензий; `isSpoiler` — boolean, `text` 350..15000 символов;
  свой `pending` видит автор, остальные — только `approved`.

`POST /api/reviews`:

- Тело F3: `{ filmId, title, text, isSpoiler }`. `ratingId` не нужен: B4 берёт
  свою Rating пользователя; без `completeness: 'full'` — `403
  FULL_RATING_REQUIRED_FOR_REVIEW`. Успех — `200` (не 201).

`GET /api/films/:id` дополнительно отдаёт `liked`, `likesCount` и `watchesCount`;
поля `inWatchlist` и «смотрел ли текущий пользователь» в фильме нет.

`POST` / `DELETE /api/films/:id/like`:

- ответ `{ liked: boolean, likesCount: number }`; `likesCount` — публичный
  взвешенный агрегат, не `counters.filmLikes`.

`GET /api/films` (каталог, 4.9):

- query: `q` (поиск по title, экранированный regex, до 100), `genre`
  (значение из `Film.genres`), `yearFrom`, `yearTo`, `rated`
  (`with|without`, также `1|0`), `sort` (`technical|vibe|combined|new|title`),
  `page`, `limit`.
- ответ: `{ films, pagination: { page, limit, total, pages }, sort }`;
  `total` — после всех фильтров. В элементах — те же агрегаты, что у каталога:
  `title`, `year`, `poster`, средние, `votesCount`/`fullCount` (нет средних —
  `null`). Фронт читает `films` и `pagination`.
- `GET /api/films/facets` → `{ genres: [{ value, count }], years: { min, max } }`.
  В Express объявлен до `/:id`.

`GET /api/watchlist/check/:filmId`:

- `{ inWatchlist: boolean, filmId }`.

`POST /api/watchlist`:

- тело `{ filmId }`; `200`/`201`, ответ `{ inWatchlist: true, filmId, addedAt }`.

`GET /api/watchlist/user`, `GET /api/users/:id/watchlist`:

- `{ items, pagination }`; элемент — WatchlistItem:
  `{ _id, addedAt, filmId: { _id, title, poster, year } }`.

`DELETE /api/watchlist/:id`:

- `:id` — `_id` записи WatchlistItem, **не** `filmId`. Идемпотентный `200`,
  ответ `{ inWatchlist: false }`. Фронт ищет `_id` через `GET /watchlist/user`.

`GET /api/users/me/privacy`, `PUT /api/users/me/privacy` (4.9):

- GET → `{ hideProfile: boolean, hideFromFeed: boolean }`.
- PUT принимает одно или оба поля; ответ — актуальный объект приватности.
- `hideProfile` скрывает профиль от других (`isHidden` в `/auth/me` и
  `/users/:id`), `hideFromFeed` исключает действия из ленты. Владелец свой
  скрытый профиль видит полностью.

`GET /api/users/me/likes`, `GET /api/users/:id/likes`:

- `{ items, pagination }`; элемент — FilmLike:
  `{ _id, addedAt, filmId: { _id, title, poster, year } }`. `weight` наружу не
  отдаётся.

`counters.filmLikes`, `counters.watchlist` и `counters.watches` приходят в
`GET /api/auth/me` и `GET /api/users/:id`; это счётчики действий, а не публичный
`Film.likesCount`.

`POST /api/watches`:

- Тело F4: `{ filmId, watchedAt, isRewatch, tags }`, `watchedAt` — `YYYY-MM-DD`;
  успех `201`, ответ — созданная запись Watch. Будущая дата — `400`; теги —
  до 10, каждый до 30 символов.
- Создаёт только Watch: Rating/Review автоматически не появляются.

`GET /api/watches/me`, `GET /api/users/:id/watches`:

- `{ items, pagination }`; элемент — `{ _id, userId, watchedAt, isRewatch, tags,
  ratingId, reviewId, createdAt, filmId: { _id, title, poster, year } }`,
  сортировка `watchedAt` desc. Свой путь — `/watches/me`, чужой —
  `/users/:id/watches`.
- Чужой скрытый профиль — `404 PROFILE_HIDDEN`; закрытый дневник —
  `403 DIARY_PRIVATE`.
- `GET /api/watches/:filmId/count` существует (`{ filmId, count }`), но фронт
  F4 берёт `watchesCount` из фильма и этот путь не вызывает.

`DELETE /api/watches/:id`:

- Удаляет свою запись по `_id`; чужая/несуществующая — `404`. Ответ
  `{ deleted: true, id }`; `counters.watches` уменьшается на бэкенде.

---

## 7. Что ещё не обновлено под vibe/full

F1 закрыл блок оценки, F2 — комментарии к фильму, F3 — рецензии, F4 — дневник
просмотров, F5/F6 — лайк, watchlist и галереи профиля, F7 — комментарии к
рецензиям, F8 — вкладки профиля и плоский дизайн профиля. Вне этих задач остаются:

- `HomePage`, карточки фильмов, топы — старые поля (`averageRating`/`finalScore`).
- `RatingDetailsModal` — легаси-поля `finalScore`/`base1`.
- Выбор vibe в комментариях — не входит в F7; отдельных задач под него нет.
- `package.json` version `2.0.0` не синхронизирован с `CHANGELOG.md` 4.8.0;
  ориентируйся на CHANGELOG.

### Живая проверка F2/F3/F4/F5/F6/F7/F8

Формы, кнопки, дневник, галереи, комментарии к рецензиям и вкладки профиля
подтверждены на production-сборке с mock API в Chrome headless: F2 — 22/22,
F3 — 29/29, F4 — 40/40, F5/F6 — 19/19, F7 — 16/16, F8 — 47/47. Живой прод-прогон не
выполнялся: Vercel preview закрыт Vercel Authentication, Render из среды
недоступен. Статус live-проверки — `[UNVERIFIED]`; это не блокер деплоя, но и не
подтверждение реального API.

---

## 8. Соглашения

- JavaScript/JSX, без TypeScript; функциональные компоненты и хуки.
- Стили — CSS-файл рядом с компонентом, классы в kebab-case. Для F2–F9 —
  токены и переиспользуемые классы из `src/styles/` (`tokens.css`, `base.css`,
  `typography.css`). `App.css` — только глобальные алиасы и общие плоские
  поверхности; старые страницы перекрашиваются через алиасы, без стекла и неона.
  Не тащить инлайновые стили из прототипов.
- Брейкпоинты едины для всех новых задач: 1024 / 860 / 768 / 620 / 520 / 480
  (зафиксированы в `tokens.css` и README; в media queries — только числа).
- Эмодзи в интерфейсе не используем. Числа и лейблы — mono, предложения — Inter,
  имена уровня h1 — Instrument Serif.
- Тексты интерфейса — русские.
- Продуктовые и контрактные решения фиксировать `// DECISION: ...` в коде.
- Бэкенд не трогать; контракт сверять с его `src/config/scoring.js` и роутами.
- `client.js` не переписывать; точечные добавления без изменения поведения — можно.
- Перед «готово»: `npm run build` и ручной сценарий в браузере.
- Не копировать HTML/CSS/JS из макетов-прототипов; переносить смысл в стиль проекта.

---

## 9. Карта файлов F1–F9

| Файл | Что важно |
|---|---|
| `src/api/client.js` | JWT, refresh, нормализация ошибок, `errorCode`/`errorDetails` |
| `src/utils/constants.js` | `CRITERIA_CONFIG`, `PRESET_WEIGHTS`, `scifi_author` |
| `src/utils/scoring.js` | grade, слова вайба, средние по блокам, technical/combined, форматирование |
| `src/pages/FilmPage/FilmPage.jsx` | страница, `RatingSection`, модалки, рецензии/комментарии, результаты `addComment`/`addReview`, `FilmActions`, `requireAuth` |
| `src/pages/FilmPage/components/FilmInfo/FilmInfo.jsx` | шапка фильма без дублей оценки |
| `src/pages/FilmPage/components/RatingSection/RatingSection.jsx` | контейнер блока оценки |
| `src/pages/FilmPage/components/RatingContext/RatingContext.jsx` | соцдоказательство, только full для «Ваша» |
| `src/pages/FilmPage/components/RatingPanel/RatingPanel.jsx` | три колонки, combined только full |
| `src/pages/FilmPage/components/RatingPanel/RatingPanel.css` | стили панели и трека |
| `src/pages/FilmPage/components/VibeTrack/VibeTrack.jsx` | drag / сегменты, клавиатура, no-op |
| `src/pages/FilmPage/components/CriteriaModal/CriteriaModal.jsx` | модалка критериев |
| `src/pages/FilmPage/components/CriteriaModal/CriteriaModal.css` | оболочка модалки, аккордеон, ошибки полей |
| `src/pages/FilmPage/components/RatingForm/RatingForm.jsx` | жанр, веса, критерии, preview, save |
| `src/pages/FilmPage/components/UsersList/UsersList.jsx` | «Оценили фильм», скрытие `finalScore` для vibe |
| `src/pages/FilmPage/components/CommentsSection/CommentsSection.jsx` | F2: три состояния формы, 403 inline, лайк без гейта; F7: режим рецензии через `targetType`/`targetId`, пагинация, ответы одного уровня |
| `src/pages/FilmPage/components/CommentsSection/CommentsSection.css` | F2: гейт, адаптив 480/620; F7: свёрнутый блок, ответы, pending |
| `src/pages/FilmPage/components/ReviewsSection/ReviewsSection.jsx` | F3: full-гейт, `CriteriaModal`, спойлер, 403, 350/15000 |
| `src/pages/FilmPage/components/ReviewsSection/ReviewsSection.css` | F3: гейт, плашка спойлера, чекбокс, адаптив 480 |
| `src/pages/FilmPage/components/FilmActions/FilmActions.jsx` | F5/F6: сердечко, watchlist, `GET /watchlist/check`, оптимистичные переключения; F4: слот «Просмотрено» |
| `src/pages/FilmPage/components/FilmActions/FilmActions.css` | F5/F6: кнопки действий, ошибка, адаптив 480; F4: `film-watch-total`, full-width на 480 |
| `src/pages/FilmPage/components/WatchAction/WatchAction.jsx` | F4: кнопка «Просмотрено», счётчик `watchesCount`, активность через `/watches/me`, модалка |
| `src/pages/FilmPage/components/WatchModal/WatchModal.jsx` | F4: дата, пересмотр, теги, inline-ошибки, `POST /watches` |
| `src/pages/FilmPage/components/WatchModal/WatchModal.css` | F4: модалка и поля, нейтральная ошибка, адаптив 620/480 |
| `src/components/ProfileGalleries/ProfileGalleries.jsx` | F5/F6: «Понравившиеся» / «Хочу посмотреть», пагинация, удаление, 404 |
| `src/components/ProfileGalleries/ProfileGalleries.css` | F5/F6: сетка 6/5/4/3/2, hover, мобильные подписи, пустые состояния |
| `src/components/ProfileDiary/ProfileDiary.jsx` | F4: дневник по месяцам, пагинация, удаление, приватность, пустые состояния; F8: `embedded` для вкладки |
| `src/components/ProfileDiary/ProfileDiary.css` | F4: карточка записи, плашка «Пересмотр», теги, hover-удаление, адаптив 620/480; F8: `.diary-section--embedded` |
| `src/pages/ProfilePage/ProfilePage.jsx` | F8: `/auth/me` + `ProfileView`, свой профиль |
| `src/pages/ProfilePage/ProfileView.jsx` | F8: `/users/:id`, skeleton/error, карточка + вкладки, обновление счётчиков и pinned |
| `src/pages/ProfilePage/ProfileCard.jsx` | F8: карточка, счётчики, pinned, achievementsCount, disabled edit |
| `src/pages/ProfilePage/ProfileTabs.jsx` | F8: семь вкладок, `?tab=`, `usePagedList`, tab-компоненты и достижения |
| `src/pages/ProfilePage/ProfilePage.css` | F8: плоская карточка/вкладки/сетки/скилетоны, адаптив 1024/768/620/480; F9: настройки приватности |
| `src/pages/ProfilePage/ProfileSettings.jsx` | F9: inline-панель `GET/PUT /users/me/privacy`, переключатели hideProfile/hideFromFeed |
| `src/components/Header/Header.jsx` | F9: самостоятельный глобальный header, `/auth/me`, logout, desktop/mobile nav |
| `src/components/Header/Header.css` | F9: плоский header, azure active, мобильная панель |
| `src/components/SiteLayout/SiteLayout.jsx` | F9: общий публичный layout (Header + Outlet) |
| `src/components/AuthLayout/AuthLayout.jsx` | F9: минимальная оболочка login/register/forgot/reset, две колонки |
| `src/components/AuthLayout/AuthLayout.css` | F9: auth-формы, aside, документальные auth-страницы |
| `src/pages/CatalogPage/CatalogPage.jsx` | F9: поиск, фильтры, сортировка, URL state, пагинация, TMDB-модалка |
| `src/pages/CatalogPage/CatalogPage.css` | F9: плоский каталог, чипы, сетка, модалка, адаптив |
| `src/pages/HomePage/HomePage.jsx` | F9: редакционная главная, топ-5, 10 новинок, импорт-редирект |
| `src/pages/HomePage/HomePage.css` | F9: плоский hero, текстовые табы, сетки топ/новинок |
| `src/pages/AboutPage/AboutPage.jsx` | F9: редакционная статья, блоки 01–05, пресеты, формула |
| `src/pages/AboutPage/AboutPage.css` | F9: плоская статья, якоря, таблицы весов |
| `src/pages/TopUsersPage/TopUsersPage.jsx` | F9: таблица-лидерборд, mono-ранги, топ-3 azure |
| `src/pages/TopUsersPage/TopUsersPage.css` | F9: плоская таблица, адаптив |
| `src/pages/PrivacyPage/PrivacyPage.jsx` | F9: документ с якорями, без auth-box/LoginPage.css |
| `src/pages/PrivacyPage/PrivacyPage.css` | F9: документная типографика, адаптив |
| `src/pages/ContactPage/ContactPage.jsx` | F9: две колонки — админы и заявка |
| `src/pages/ContactPage/ContactPage.css` | F9: flat contact grid, поля, успех/ошибка |
| `src/pages/AdminPanel/AdminPanel.jsx` | F9: служебный layout, `.admin-back`, без glass |
| `src/pages/AdminPanel/AdminPanel.css` | F9: плоские таблицы/секции, нейтральные reject-кнопки |
| `src/pages/FilmPage/hooks/useFilmData.js` | загрузка фильма и `silent`-обновление |
| `src/pages/FilmPage/hooks/useVibeRating.js` | vibe-only сохранение/отмена, 429, `errorCode`, оптимистичный rollback |
| `src/pages/FilmPage/components/RatingPanel/RatingPanel.jsx` | vibe/technical/combined, «Отменить вайб», `вайб N` при vibe-only |
| `src/utils/scoring.js` | `formatVibe` → `вайб N`, `formatScore` не доизобретает 0 |
| `src/pages/FilmPage/hooks/useRatingForm.js` | черновик full-оценки, веса, preview, save |
| `src/pages/FilmPage/hooks/usePointerCoarse.js` | drag vs сегменты |
| `CHANGELOG.md` | 4.1–4.9: что и почему |
| `screenshots/f2-comments/`, `screenshots/f3-reviews/`, `screenshots/f4-diary/`, `screenshots/f5-f6/`, `screenshots/f7-review-comments/`, `screenshots/f8-profile/`, `screenshots/design-mopup/`, `screenshots/ratings-sort/`, `screenshots/vibe-cancel/` | скриншоты F2/F3/F4/F5+F6/F7/F8, редизайна 4.9, сортировки оценок и отмены вайба |

Все компоненты сгруппированы в одноимённые папки: `X/X.jsx` и, если есть,
`X/X.css`. Это касается `src/components`, `src/components/Critic`
(`CriticHero`, `CriticReviews`, `CriticTopMovies`) и
`src/pages/FilmPage/components`. Плоских `.jsx`/`.css` в этих каталогах нет.

---

## 10. Быстрый чек-лист перед изменениями

1. `git status` — не в чужой ли ветке; ожидаем `feature/f1-vibe-rating` или новую
   `feature/...`.
2. Прочитать §5: F1 — combined/technical только full; F2 — комментарий к фильму
   с любой оценкой; F3 — рецензия только с full + spoiler; F5/F6 — лайк и
   watchlist без гейта, галереи профиля; F7 — комментарии к рецензиям без гейта
   по `userRating`.
3. Сверить ключи `scores` и названия счётчиков с бэкендом, не с прототипом.
4. Не показывать `0` как результат там, где это маркер «не вычислено».
5. `npm run build` — собирается.
6. Ручной сценарий: нет оценки → vibe → full; проверить `Ваша`, delta, CTA,
   список «Оценили фильм».
7. F2/F3: 403 ловить по `errorCode`, текст формы не терять; `POST /reviews` —
   без `ratingId`, с `isSpoiler`; длина рецензии 350..15000.
8. F5/F6: лайк — `liked/likesCount` из фильма; watchlist проверять отдельно;
   удалять запись по `_id` WatchlistItem, а не по `filmId`; счётчики
   `counters.filmLikes/watchlist` держать синхронными с секциями.
9. F4: `POST /watches` — дата/пересмотр/теги, счётчик из `film.watchesCount`;
   чужой дневник — `/users/:id/watches`, удаление по `_id` Watch; не создавать
   Rating/Review автоматически; при удалении перечитывать открытые страницы.
10. F8: вкладки — только `?tab=`, default `ratings`; свои — через `:id = currentUser._id`,
    не `/me/*`; карточка `GET /users/:id` возвращает `{ user }`; pinned — одно
    значение, `PUT /users/me/pinned-achievement`; плоские стили только профиля.
11. F9: каталог — отдельный `/catalog`, Home — редакционная; фильтры идут в
    `GET /films` (`q/genre/yearFrom/yearTo/rated/sort/page`), фасеты — в
    `/films/facets`. Header один на публичных страницах, auth — `AuthLayout`.
    После импорта — сразу `/film/:id`, без дубля `film_add`. В профиле
    «Настройки» → `GET/PUT /users/me/privacy`; свой скрытый профиль виден
    владельцу. Новые стили — только токены, без теней/glass/transform/анимаций.
12. Если меняешь `client.js` — только точечно и без изменения поведения.
13. F10: отменять можно только `completeness: 'vibe'`; full → 400. Вайб
    показывать как `вайб N` везде, где нет technical/combined, а не `—`;
    событие `vibe` — «поставил вайб … — N/10». Не выводить `0` как балл.

---

## 11. F-DESIGN: слой стилей и страница фильма

- Палитра: бордо (`void/canvas/surface`) + azure (действие) + cyan (сильные данные).
  Розовый — только аура бренда, негативная дельта и грейд S. Старые золото/неон
  не использовать; в `App.css` остались только алиасы старых имён на новые токены.
- Хедер: фиксированный 56px, `.hdr`; бренд `Cinephilium` с двумя слоями ауры,
  навигация mono, тулзы. На ≤768px навигация скрыта.
- Страница фильма: `.film-hero` (backdrop 55vh, постер 340px, инфо), `.film-layout`
  (main + sidebar 300px). Рецензии, комментарии и «Оценили фильм» — плоские
  секции с разделителями, без `.glass-card`, blur и цветных свечений.
- Модалка критериев: `.modal-overlay` + `.modal-content`, внутри `.rating-form`
  (select жанра, полоса весов, аккордеон `.crit`, 2px-слайдеры, preview).
- F5/F6: `.film-actions` — плоские pill-кнопки под панелью оценки; активное
  состояние — azure, счётчик mono. `.pg-grid` — постеры 2/3 без карточек, hover-
  оверлей на градиенте, на мобиле подписи под постером. Новых hex/шрифтов/
  брейкпоинтов нет.
- F4: «Просмотрено» — тот же `.film-action`, счётчик `.film-watch-total`;
  модалка использует `.modal-overlay`/`.modal-content`, поля `.watch-input`.
  `.diary-*` — плоская лента с месячными mono-заголовками, постер 2/3,
  нейтральная плашка «Пересмотр», hover-удаление. Новых hex/шрифтов/
  брейкпоинтов нет.
- F8: профиль — плоская карточка `.profile-card`, счётчики mono, pinned-бейдж,
  строка вкладок `.profile-tab` (mono 11 uppercase, активная — ink + azure
  underline), сетка оценок 5/4/3/2, плоские рецензии/комментарии/достижения.
  Никаких `box-shadow`, `backdrop-filter`, `translate/scale`, анимаций появления
  и transitions >0.16s. Новых hex/шрифтов/брейкпоинтов нет.
- Черновик/сохранение полной оценки остаются в `useRatingForm`, vibe-only — в
  `useVibeRating`. Визуальный слой не меняет формулы и контракт.
