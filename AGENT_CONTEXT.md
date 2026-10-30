# Контекст фронтенда Cinephilium

**Дата среза:** 30.10.2026  
**Ветка:** `feature/f1-vibe-rating`  
**Репозиторий:** https://github.com/Fearrlesz/cinephilium-frontend  
**Бэкенд:** https://github.com/Fearrlesz/cinephilium-backend  
**Документация версии:** `CHANGELOG.md` (4.2.0)
**Дизайн-хендофф:** `DESIGN_HANDOFF.md` — палитра, типографика, компоненты,
точные значения из `tokens.css`.

Это рабочая карта фронтенда: как он устроен, что уже сделано в F1, какие решения
зафиксированы и что нельзя сломать. Это не README: корневой `README.md` — витрина
проекта, а не инструкция по разработке.

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
  components/          Header, NotificationModal, ActivityFeed, RatingDetailsModal,
                       CustomSelect, Critic/*
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

Страницы лежат в папках `<Name>/<Name>.jsx` + `<Name>.css`; компоненты страницы —
в `components/`, хуки — в `hooks/`.

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
  FilmInfo.jsx                 постер, заголовок, описание, мета
  RatingSection.jsx            контейнер: соцдоказательство + панель + модалка
    RatingContext.jsx          «Сообщество / Ваша / delta»
    RatingPanel.jsx            три колонки
      VibeTrack.jsx            drag-трек / 10 сегментов
    CriteriaModal.jsx          модалка полной оценки
      RatingForm.jsx           жанр, веса, аккордеон, preview, save
  UsersList.jsx                «Оценили фильм»
  ReviewsSection.jsx
  CommentsSection.jsx
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

`GET /api/films/:id/users`:

- отдаёт `rating.completeness`, `technicalScore`, `combinedScore`, `finalScore`;
- для vibe-only `finalScore: 0` — **известное ограничение бэкенда**. Фронт скрывает
  цифру, если `completeness === 'vibe'`; правильный фикс — на бэкенде.

---

## 7. Что ещё не обновлено под vibe/full

F1 закрыл только блок оценки на странице фильма. Вне F1 остаются:

- `ProfilePage` и `UserProfilePage` — используют старые `/ratings/user`,
  `/reviews/user` и профильные ответы; вкладки B9 (`/users/:id/ratings` и т.д.)
  фронт ещё не потребляет.
- `HomePage`, карточки фильмов, топы — старые поля (`averageRating`/`finalScore`).
- `RatingDetailsModal` — легаси-поля `finalScore`/`base1`.
- Комментарии к рецензиям (B8) и выбор vibe в комментариях — следующие задачи.
- `package.json` version `2.0.0` не синхронизирован с `CHANGELOG.md` 4.1.1;
  ориентируйся на CHANGELOG.

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

## 9. Карта файлов F1

| Файл | Что важно |
|---|---|
| `src/api/client.js` | JWT, refresh, нормализация ошибок, `errorCode`/`errorDetails` |
| `src/utils/constants.js` | `CRITERIA_CONFIG`, `PRESET_WEIGHTS`, `scifi_author` |
| `src/utils/scoring.js` | grade, слова вайба, средние по блокам, technical/combined, форматирование |
| `src/pages/FilmPage/FilmPage.jsx` | страница, `RatingSection`, модалки, рецензии/комментарии |
| `src/pages/FilmPage/components/FilmInfo.jsx` | шапка фильма без дублей оценки |
| `src/pages/FilmPage/components/RatingSection.jsx` | контейнер блока оценки |
| `src/pages/FilmPage/components/RatingContext.jsx` | соцдоказательство, только full для «Ваша» |
| `src/pages/FilmPage/components/RatingPanel.jsx` | три колонки, combined только full |
| `src/pages/FilmPage/components/RatingPanel.css` | стили панели и трека |
| `src/pages/FilmPage/components/VibeTrack.jsx` | drag / сегменты, клавиатура, no-op |
| `src/pages/FilmPage/components/CriteriaModal.jsx` | модалка критериев |
| `src/pages/FilmPage/components/CriteriaModal.css` | оболочка модалки, аккордеон, ошибки полей |
| `src/pages/FilmPage/components/RatingForm.jsx` | жанр, веса, критерии, preview, save |
| `src/pages/FilmPage/components/UsersList.jsx` | «Оценили фильм», скрытие `finalScore` для vibe |
| `src/pages/FilmPage/hooks/useFilmData.js` | загрузка фильма и `silent`-обновление |
| `src/pages/FilmPage/hooks/useVibeRating.js` | vibe-only сохранение, 429, `errorCode` |
| `src/pages/FilmPage/hooks/useRatingForm.js` | черновик full-оценки, веса, preview, save |
| `src/pages/FilmPage/hooks/usePointerCoarse.js` | drag vs сегменты |
| `CHANGELOG.md` | 4.1 и 4.1.1: что и почему |

---

## 10. Быстрый чек-лист перед изменениями

1. `git status` — не в чужой ли ветке; ожидаем `feature/f1-vibe-rating` или новую
   `feature/...`.
2. Прочитать §5–§6: combined/technical — только full; vibe-only — прочерки.
3. Сверить ключи `scores` и названия счётчиков с бэкендом, не с прототипом.
4. Не показывать `0` как результат там, где это маркер «не вычислено».
5. `npm run build` — собирается.
6. Ручной сценарий: нет оценки → vibe → full; проверить `Ваша`, delta, CTA,
   список «Оценили фильм».
7. Если меняешь `client.js` — только точечно и без изменения поведения.

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
- Черновик/сохранение полной оценки остаются в `useRatingForm`, vibe-only — в
  `useVibeRating`. Визуальный слой не меняет формулы и контракт.
