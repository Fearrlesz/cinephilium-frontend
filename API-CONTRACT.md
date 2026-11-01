# API-CONTRACT — Cinephilium Frontend

**Статус файла:** создан с нуля 2026-10-30, потому что `API-CONTRACT.md` отсутствовал
в репозитории и во всех удалённых ветках (`feature/f1-vibe-rating`, `main`, `3.0`,
`feat/api-v3-compat`).

**Живая верификация:** не выполнялась. Прод-API
`https://cinephilium-backend.onrender.com/api` из среды проверки недоступен
(TLS/schannel `SEC_E_NO_CREDENTIALS`, Node `fetch failed`), локального API на
3000/3001/5000/5001/3100 нет, `.env` во фронтенде отсутствует. Поэтому **ни один
эндпоинт не подтверждён curl-ом**. Формы ниже — ожидания из `AGENT_CONTEXT.md`,
`CHANGELOG.md` и зафиксированных DECISION B1–B9 / B-PRIVACY / B6 / B7 / B8.
Всё, что не описано в этих файлах, помечено `[UNVERIFIED]` без домысливания полей.

**Обновление 2026-11-01:** формы F2/F3 проверены кодом и браузером на mock API
(`POST /comments` → `{ filmId, text }`, `POST /reviews` →
`{ filmId, title, text, isSpoiler }`); живые ответы прода по-прежнему
`[UNVERIFIED]`.

Обозначения:

- `[UNVERIFIED: API недоступен; форма из AGENT_CONTEXT]` — форма описана в репо,
  но ответ API не получен.
- `[UNVERIFIED: API недоступен; форма не описана]` — поля/конверт неизвестны.
- `[UNVERIFIED: прод; мутация не выполнялась]` — POST/PUT/DELETE, которые нельзя
  дергать на проде.

---

## 1. Общие правила

### Base URL

```
REACT_APP_API_URL || https://cinephilium-backend.onrender.com/api
```

`.env` в репозитории нет; `src/api/client.js` использует прод-фолбэк. Все пути
ниже — относительно `/api`.

### Авторизация

- Access-токен: `localStorage.accessToken`, дублируется в `localStorage.token`.
- Заголовок: `Authorization: Bearer <accessToken>`.
- `withCredentials: true` — HttpOnly refresh-cookie.
- На `401` клиент делает один `POST /auth/refresh` и повторяет исходный запрос.
- `POST /auth/logout` отзывает сессию, затем клиент чистит localStorage.

### Формат ошибки

Подтверждён кодом клиента (`src/api/client.js`), но не живым ответом:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Текст для пользователя",
    "details": []
  }
}
```

`details` опциональны. `client.js` сохраняет `errorCode` и `errorDetails`, а
`error` нормализует в строку для старого UI.

### Пагинация

Точный конверт не подтверждён. Для части списков в CHANGELOG 3.0 зафиксирован
`{ items, pagination }` (например, топ пользователей), но для фильмов,
комментариев, рецензий и профильных вкладок это **не проверено**.
См. `[UNVERIFIED]` у конкретных эндпоинтов.

---

## 2. Публичные GET

| Эндпоинт | Форма / поля | Статус |
|---|---|---|
| `GET /films?limit=1` | Каталог. Точный конверт (`items`/`pagination`/`total`) неизвестен. B2: в каталоге отсутствующие средние — `null`, `averageRating` — алиас `averageTechnical`. | `[UNVERIFIED: API недоступен; конверт не описан]` |
| `GET /films/:id` | См. §2.1. | `[UNVERIFIED: API недоступен; форма из AGENT_CONTEXT §6]` |
| `GET /films/:id/users` | Массив оценок; `rating.completeness`, `technicalScore`, `combinedScore`, `finalScore`. Для vibe-only `finalScore: 0` — известное ограничение. | `[UNVERIFIED: API недоступен; форма из AGENT_CONTEXT §6]` |
| `GET /comments/:filmId` | Список комментариев к фильму. B8: у комментария есть `targetType: 'film' \| 'review'` и `targetId`; для фильма `targetType: 'film'`. Точные поля/конверт не описаны. | `[UNVERIFIED: API недоступен; форма не описана]` |
| `GET /reviews/:filmId` | Список рецензий. B4: `isSpoiler`, текст 350..15000; точные поля/конверт не описаны. | `[UNVERIFIED: API недоступен; форма не описана]` |
| `GET /watches/:filmId/count` | Счётчик просмотров/записей Watch. Вероятное поле `count`, но точная форма не описана. | `[UNVERIFIED: API недоступен; форма не описана]` |
| `GET /users/nickname/:nickname` | Публичная карточка пользователя. Точные поля не описаны. | `[UNVERIFIED: API недоступен; форма не описана]` |

### 2.1 `GET /films/:id`

Проверенная по документации форма (не по curl):

```json
{
  "averageVibe": 8.1,
  "averageTechnical": 84.2,
  "averageCombined": 85.6,
  "votesCount": 128,
  "vibesCount": 52,
  "fullCount": 76,
  "userRating": {
    "completeness": "full",
    "vibe": 9,
    "technicalScore": 88.4,
    "combinedScore": 88.9,
    "scores": {
      "scenario": { "plot": 9, "ideas": 9, "dialogue": 8 },
      "characters": { "depth": 9, "chemistry": 8, "functionality": 8 },
      "visual": { "composition": 10, "cinematography": 9, "pacing": 7, "tone": 9 },
      "sound": { "music": 9, "design": 8, "narrative": 8 },
      "style": { "originality": 9, "boldness": 9 }
    },
    "genrePreset": "hybrid",
    "blockWeights": [25, 20, 20, 15, 20]
  }
}
```

Правила (B1/B2/F1):

- `userRating` отсутствует или `null`, если оценки нет.
- `completeness: 'vibe'` — только вайб; `technicalScore: 0`, `combinedScore: 0`
  означают «не вычислено», а не результат.
- `completeness: 'full'` — есть `scores`, `technicalScore`, `combinedScore`.
- На странице фильма отсутствующие средние приходят `0`; «—» включается по
  счётчикам `fullCount === 0` / `votesCount === 0`, а не по нулю.
- `votesCount` — все оценки, `vibesCount` — только vibe, `fullCount` — только full.
- `averageRating` — алиас `averageTechnical` (B2), но в каталоге отсутствующие
  средние — `null`, на странице фильма — `0`.

---

## 3. Авторизованные GET

Все — с `Authorization: Bearer <token>`. Ни один не проверён живым запросом.

| Эндпоинт | Ожидаемая форма | Статус |
|---|---|---|
| `GET /auth/me` | Текущий пользователь. Точные поля не описаны. | `[UNVERIFIED: API недоступен; нет токена]` |
| `GET /users/:id` | Карточка пользователя. B9: legacy-массивы `ratings/reviews/comments/watches/achievements` **убраны**; есть `pinnedAchievement`, `achievementsCount`. Остальные поля не описаны. | `[UNVERIFIED: API недоступен; нет токена]` |
| `GET /users/:id/ratings` | Вкладка оценок (B9). Конверт не описан. | `[UNVERIFIED: API недоступен; форма не описана]` |
| `GET /users/:id/reviews` | Вкладка рецензий (B9). Конверт не описан. | `[UNVERIFIED: API недоступен; форма не описана]` |
| `GET /users/:id/comments` | Вкладка комментариев (B9). Конверт не описан. | `[UNVERIFIED: API недоступен; форма не описана]` |
| `GET /users/:id/watches` | Вкладка Watch (B5/B9). Конверт не описан. | `[UNVERIFIED: API недоступен; форма не описана]` |
| `GET /users/:id/watchlist` | Watchlist пользователя (B6/B9). Конверт не описан. | `[UNVERIFIED: API недоступен; форма не описана]` |
| `GET /users/:id/likes` | Лайки фильмов (B7/B9). Конверт не описан. | `[UNVERIFIED: API недоступен; форма не описана]` |
| `GET /users/:id/achievements` | Достижения. В CHANGELOG 3.0 упомянуты `earned`/`possible`; точная форма не подтверждена. | `[UNVERIFIED: API недоступен; нет токена]` |
| `GET /watchlist/user` | Watchlist текущего пользователя. Конверт не описан. | `[UNVERIFIED: API недоступен; нет токена]` |
| `GET /watchlist/check/:filmId` | Проверка фильма в watchlist. Вероятное поле `inWatchlist`, но не описано. | `[UNVERIFIED: API недоступен; форма не описана]` |
| `GET /watches/user` | Watch текущего пользователя. Конверт не описан. | `[UNVERIFIED: API недоступен; форма не описана]` |
| `GET /users/me/pinned-achievement` | Закреплённое достижение (B9). Ожидается `pinnedAchievement`; точная форма не описана. | `[UNVERIFIED: API недоступен; нет токена]` |

### 3.1 Privacy (B-PRIVACY)

- `hideProfile`, `hideFromFeed`, `canViewProfile` — поля профиля/карточки.
- Для личных разделов скрытого профиля API отдаёт `404` (а не пустой список).
- Точные имена полей и код ошибки `PROFILE_HIDDEN` не подтверждены.
- `[UNVERIFIED: API недоступен; нет токена]`

---

## 4. Мутации — не выполнялись

На проде ничего не создавалось. Все пути ниже, кроме явно зафиксированных в
`AGENT_CONTEXT.md` / `CHANGELOG.md`, считаются **непроверенными**.

### 4.1 Auth

| Метод | Путь | Тело | Ожидаемый ответ | Статус |
|---|---|---|---|---|
| POST | `/auth/login` | `{ nickname, password }` | `{ accessToken, user }` (точная форма не описана) | `[UNVERIFIED: прод; мутация не выполнялась]` |
| POST | `/auth/register` | nickname, password, invite-код, согласия | пользователь/токен; форма не описана | `[UNVERIFIED: прод; мутация не выполнялась]` |
| POST | `/auth/refresh` | refresh-cookie | `{ accessToken }` (по `client.js`) | `[UNVERIFIED: прод; мутация не выполнялась]` |
| POST | `/auth/logout` | — | `204`/`200`; форма не описана | `[UNVERIFIED: прод; мутация не выполнялась]` |

### 4.2 Оценки

`POST /api/ratings` — форма зафиксирована в `AGENT_CONTEXT.md` §6:

- `{ filmId, vibe }` — vibe-only, `201`, `completeness: 'vibe'`, `technicalScore: 0`,
  `combinedScore: 0`.
- `{ filmId, vibe, scores, genrePreset?, blockWeights?, textReview? }` — full,
  `201`, `completeness: 'full'`; апгрейд vibe → full тем же payload.
- `blockWeights` — массив 5 чисел, сумма ровно 100; `genrePreset: 'hybrid'` —
  ручные веса.
- Ключи `scores` фиксированы: `scenario {plot, ideas, dialogue}`,
  `characters {depth, chemistry, functionality}`,
  `visual {composition, cinematography, pacing, tone}`,
  `sound {music, design, narrative}`, `style {originality, boldness}`.
- `ALREADY_FULL_RATING` (`400`) — попытка vibe-only для уже полной оценки;
  `VIBE_LIMIT_REACHED` (`429`, `details.retryAt`) — лимит 50 vibe/сутки.
- `[UNVERIFIED: прод; мутация не выполнялась]`

### 4.3 Комментарии и рецензии

- `POST /api/comments` — комментарий.
  - Фронт F2 отправляет `{ filmId, text }`. B8: без `targetType` это комментарий
    к фильму, `targetId` берётся как `targetId ?? filmId`.
  - Альтернативный B8-формат: `{ targetType: 'film' | 'review', targetId, text }`.
  - Без Rating — `403 RATING_REQUIRED_FOR_COMMENT`; лайк не гейтится.
  - `[UNVERIFIED: прод; мутация не выполнялась]`
- `POST /api/reviews` — рецензия.
  - Тело F3: `{ filmId, title, text, isSpoiler }`. `ratingId` не отправляется:
    B4 берёт свою Rating пользователя.
  - Текст 350..15000; без `completeness: 'full'` —
    `403 FULL_RATING_REQUIRED_FOR_REVIEW`; успех — `200` (не 201).
  - `[UNVERIFIED: прод; мутация не выполнялась]`
- `POST /api/comments/:id/like`, `POST /api/reviews/:id/like` — лайки; используются
  фронтендом, но форма ответа не описана.
- `[UNVERIFIED: прод; мутация не выполнялась]`

### 4.4 Watch / Watchlist / Likes / достижения

| Метод | Путь | Ожидание | Статус |
|---|---|---|---|
| POST | `/watches` | запись Watch (B5); точный путь/тело не описаны | `[UNVERIFIED: прод; мутация не выполнялась]` |
| POST | `/watchlist` | добавить в watchlist (B6); ответ `201`/`200` не подтверждён | `[UNVERIFIED: прод; мутация не выполнялась]` |
| DELETE | `/watchlist/:filmId` | удалить из watchlist (B6); точный путь не подтверждён | `[UNVERIFIED: прод; мутация не выполнялась]` |
| POST | `/films/:id/like` | лайк фильма (B7); точный путь не подтверждён | `[UNVERIFIED: прод; мутация не выполнялась]` |
| DELETE | `/films/:id/like` | снять лайк (B7); точный путь не подтверждён | `[UNVERIFIED: прод; мутация не выполнялась]` |
| PUT | `/users/me/pinned-achievement` | закрепить достижение (B9); тело/ответ не описаны | `[UNVERIFIED: прод; мутация не выполнялась]` |

`ACHIEVEMENT_NOT_EARNED` — ожидаемая ошибка при попытке закрепить недостигнутое
достижение; точный статус не подтверждён. `[UNVERIFIED: прод; мутация не выполнялась]`

---

## 5. Коды ошибок

### Подтверждено форматом клиента

- Конверт: `{ error: { code, message, details? } }` — из `src/api/client.js`.
- `client.js` сохраняет `errorCode`/`errorDetails` и приводит `error` к строке.

### Не проверено живым API

| Проверка | Ожидание | Статус |
|---|---|---|
| `GET /films/not-an-id` | `400 VALIDATION_ERROR` или `404 NOT_FOUND` — точный статус неизвестен | `[UNVERIFIED: API недоступен]` |
| `GET /nonexistent-route` | `404 NOT_FOUND` | `[UNVERIFIED: API недоступен]` |
| `GET /users/nonexistent-nickname` | `404 NOT_FOUND` | `[UNVERIFIED: API недоступен]` |
| `POST /comments` без рейтинга | `403 RATING_REQUIRED_FOR_COMMENT` (B3) | `[UNVERIFIED: нужен авторизованный пользователь]` |
| `POST /reviews` без full | `403 FULL_RATING_REQUIRED_FOR_REVIEW` (B4) | `[UNVERIFIED: нужен авторизованный пользователь]` |
| vibe-only для full | `400 ALREADY_FULL_RATING` | `[UNVERIFIED: нужен авторизованный пользователь]` |
| лимит vibe | `429 VIBE_LIMIT_REACHED` + `details.retryAt` | `[UNVERIFIED: нужен авторизованный пользователь]` |
| скрытый профиль | `404` / `PROFILE_HIDDEN` (B-PRIVACY) | `[UNVERIFIED: нужен авторизованный пользователь]` |
| чужое достижение | `ACHIEVEMENT_NOT_EARNED` | `[UNVERIFIED: нужен авторизованный пользователь]` |

---

## 6. Что осталось непроверенным

- Все публичные GET: API недоступен из среды.
- Все авторизованные GET: нет `TEST_ACCESS_TOKEN` / тестового аккаунта, API недоступен.
- Все POST/PUT/DELETE: нельзя выполнять на проде; тестового окружения нет.
- Точные конверты списков (`items`/`pagination`/`total`) и поля профилей,
  комментариев, рецензий, watchlist, likes, достижений — не описаны в репо.
- `RATING_REQUIRED_FOR_COMMENT`, `FULL_RATING_REQUIRED_FOR_REVIEW`,
  `ALREADY_FULL_RATING`, `VIBE_LIMIT_REACHED`, `PROFILE_HIDDEN`,
  `ACHIEVEMENT_NOT_EARNED` — ожидания из DECISION, но не живые ответы.
- Формы F2/F3 (`{ filmId, text }`, `{ filmId, title, text, isSpoiler }`)
  подтверждены кодом и браузером на mock API; живые ответы прода — нет.

---

## 7. Changelog верификации

### 2026-11-01 — F2/F3

- **Формы подтверждены в браузере на mock API:** F2 — 22/22 сценария,
  F3 — 29/29. Это проверяет фронт, но не живой прод.
- **F2:** `POST /api/comments` уходит как `{ filmId, text }`; 403
  `RATING_REQUIRED_FOR_COMMENT` ловится по `errorCode`, текст сохраняется.
- **F3:** `POST /api/reviews` уходит как `{ filmId, title, text, isSpoiler }`;
  `ratingId` отсутствует; 403 `FULL_RATING_REQUIRED_FOR_REVIEW` ловится по
  `errorCode`, текст и чекбокс сохраняются.
- **Длина:** 350..15000; фронт `MAX_TEXT = 15000`.
- **Живой API:** по-прежнему недоступен (`cinephilium-backend.onrender.com` —
  TLS reset; Vercel preview закрыт Vercel Authentication). Статусы live-проверок
  остаются `[UNVERIFIED]`.

### 2026-10-30

- **Файл создан с нуля.** `API-CONTRACT.md` отсутствовал в `HEAD`, `origin/main`,
  `origin/feature/f1-vibe-rating`, `origin/3.0`, `feat/api-v3-compat` и во всём
  рабочем каталоге пользователя.
- **Живых проверок: 0.** API `https://cinephilium-backend.onrender.com/api`
  недоступен: `curl` — `schannel: SEC_E_NO_CREDENTIALS`, Node `fetch` — `fetch failed`.
  Локального API на 3000/3001/5000/5001/3100 нет; `.env` фронтенда отсутствует.
- **Снято `[VERIFY]`: 0** — в созданном файле их не было.
- **Осталось `[UNVERIFIED]`:** все 6 публичных GET, 13 авторизованных GET,
  все мутации и все коды ошибок (см. §2–§5).
- **Расхождения «контракт/сессия ожидали X, API вернул Y»:** не зафиксированы,
  потому что ответов API не было. Формы из `AGENT_CONTEXT.md` §6 и DECISION
  B1–B9 внесены как ожидания, а не как подтверждённые факты.
- **Следующий шаг:** получить доступный staging/local API и тестовый токен,
  прогнать публичные GET + авторизованные GET, затем заменить `[UNVERIFIED]`
  на `verified YYYY-MM-DD curl` и дописать сюда расхождения.
