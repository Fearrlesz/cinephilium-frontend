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

**Обновление 2026-11-02:** формы F5/F6 проверены кодом бэкенда и браузером на
mock API (лайк `POST`/`DELETE /films/:id/like`, watchlist
`POST /watchlist { filmId }`, `DELETE /watchlist/:id` по `_id` WatchlistItem,
галереи `/users/me/likes`, `/users/:id/likes`, `/watchlist/user`,
`/users/:id/watchlist` → `{ items, pagination }`); живые ответы прода —
`[UNVERIFIED]`.

**Обновление 2026-11-02 (F4):** дневник проверен кодом `watches.routes.js` и
браузером на mock API: `POST /watches { filmId, watchedAt, isRewatch, tags }`,
`GET /watches/me`, `GET /users/:id/watches` → `{ items, pagination }`,
`DELETE /watches/:id` по `_id` записи. Счётчик — `film.watchesCount` из
`GET /films/:id`; отдельный `GET /watches/:filmId/count` существует, но фронт
его не вызывает. Живые ответы прода — `[UNVERIFIED]`.

**Обновление 2026-11-02 (F7):** комментарии к рецензиям проверены кодом
`comments.routes.js` и браузером на mock API: `GET /comments?targetType=review&
targetId=...&page=&limit=` → `{ items, pagination }`, у корней есть `replies[]`;
`POST /comments { targetType: 'review', targetId, text, parentId? }` без гейта
по оценке; `POST /comments/:id/like` → `{ liked, likes }`. Старый
`GET /comments/:filmId` остаётся массивом комментариев к фильму. Живые ответы
прода — `[UNVERIFIED]`.

**Обновление 2026-11-03 (4.10):** `DELETE /api/ratings/:id` отменяет только
vibe-оценку владельца: удаляет Rating/Action/Event `vibe`, отвязывает
`Watch.ratingId`, `counters.vibes -1`, `totalPoints -2`; ответ
`{ deleted: true, filmId }`. Full → `400 FULL_RATING_CANNOT_BE_CANCELLED`;
чужая/нет → `404 NOT_FOUND`. `GET /events` для типа `vibe` отдаёт
`metadata.vibe` (1–10) и `score: null`; фронт показывает `вайб N`, а не
generic-фразу. Живые ответы прода — `[UNVERIFIED]`.

**Обновление 2026-11-03 (4.9):** каталог проверен кодом `films.routes.js` и
mock API: `GET /films` принимает `q`, `genre`, `yearFrom`, `yearTo`, `rated`
(`with|without`, также `1|0`), `sort` (`technical|vibe|combined|new|title`),
`page`, `limit` и возвращает `{ films, pagination, sort }`; `pagination.total`
считается после фильтров. `GET /films/facets` → `{ genres: [{value,count}],
years: {min,max} }`, объявлен до `/:id`. Импорт фильма пишет единственное
событие `film_add` на бэкенде, фронт после успеха сразу ведёт на `/film/:id`.
`GET/PUT /users/me/privacy` → `{ hideProfile, hideFromFeed }`; PUT принимает
одно или оба поля. Живые ответы прода — `[UNVERIFIED]`.

**Обновление 2026-11-03 (F8):** вкладки профиля проверены кодом `users.routes.js`,
`profileTabsQuery.js` и браузером на mock API: `GET /users/:id` →
`{ user }` с `counters`, `pinnedAchievement`, `achievementsCount`;
`/users/:id/{ratings,reviews,comments,watches,watchlist,likes,achievements}` →
`{ items, pagination }` (кроме achievements — `{ earned, possible, ... }`);
`PUT /users/me/pinned-achievement { achievement: string|null }` заменяет одно
значение, недостигнутое → `400 ACHIEVEMENT_NOT_EARNED`. Живые ответы прода —
`[UNVERIFIED]`.

Обозначения:

- `[UNVERIFIED: API недоступен; форма из AGENT_CONTEXT]` — форма описана в репо,
  но ответ API не получен.
- `[UNVERIFIED: API недоступен; форма не описана]` — поля/конверт неизвестны.
- `[UNVERIFIED: прод; мутация не выполнялась]` — POST/PUT/DELETE, которые нельзя
  дергать на проде.
- `[UNVERIFIED live; форма из кода]` — форма выведена из кода бэкенда и
  проверена на mock API, живой ответ не получен.

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

Для F4–F7 списки проверены кодом и mock API и используют
`{ items, pagination }`; каталог `GET /films` использует `{ films, pagination,
sort }` (поле `films`, не `items`). Для рецензий и части старых ответов конверт
по-прежнему **не подтверждён**. См. `[UNVERIFIED]` у конкретных эндпоинтов.

---

## 2. Публичные GET

| Эндпоинт | Форма / поля | Статус |
|---|---|---|
| `GET /films?q=&genre=&yearFrom=&yearTo=&rated=&sort=&page=&limit=` | Каталог: `{ films, pagination: {page,limit,total,pages}, sort }`; `total` после фильтров. `q` — regex по title, `genre` — значение `Film.genres`, `rated` — `with\|without` (`1\|0`), `sort` — `technical\|vibe\|combined\|new\|title`. B2: отсутствующие средние — `null`, `averageRating` — алиас `averageTechnical`. | `[UNVERIFIED live; форма из films.routes.js + mock API]` |
| `GET /films/facets` | `{ genres: [{ value, count }], years: { min, max } }` для фильтров каталога. Объявлен до `GET /films/:id`. | `[UNVERIFIED live; форма из films.routes.js + mock API]` |
| `GET /films/:id` | См. §2.1; дополнительно `liked: boolean`, `likesCount: number`, без `inWatchlist`. | `[UNVERIFIED live; форма из кода Films/Presenter]` |
| `GET /films/:id/users` | Массив оценок; `rating.completeness`, `technicalScore`, `combinedScore`, `finalScore`. Для vibe-only `finalScore: 0` — известное ограничение. | `[UNVERIFIED: API недоступен; форма из AGENT_CONTEXT §6]` |
| `GET /comments?targetType=film\|review&targetId=&page=&limit=` | Единый список с пагинацией: `{ items, pagination }`; корень содержит `replies[]` (один уровень). Видимость: approved всем, свои pending автору, всё админу. Без `targetType` — 400. | `[UNVERIFIED live; форма из comments.routes.js]` |
| `GET /comments/:filmId` | Legacy-список комментариев к фильму: массив корней с `replies[]`; только `targetType: film` (B8/3A). Формат не менялся. | `[UNVERIFIED live; форма из comments.routes.js]` |
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
  "liked": false,
  "likesCount": 10,
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
- `liked` и `likesCount` — публичный агрегат лайков фильма; `likesCount` считает
  только лайки с `weight > 0`. `inWatchlist` в ответе нет: его даёт отдельный
  `GET /watchlist/check/:filmId`.

---

## 3. Авторизованные GET

Все — с `Authorization: Bearer <token>`. Ни один не проверён живым запросом.

| Эндпоинт | Ожидаемая форма | Статус |
|---|---|---|
| `GET /auth/me` | Текущий пользователь. Точные поля не описаны. | `[UNVERIFIED: API недоступен; нет токена]` |
| `GET /users/:id` | Карточка профиля: `{ user: { id, nickname, avatar, registeredAt, isAdmin, totalPoints, counters, diaryPrivate, pinnedAchievement, achievementsCount, isHidden? } }`. B9: legacy-массивы `ratings/reviews/comments/watches/achievements` **убраны**. Скрытый профиль — `{ user: hiddenProfileStub }` с `isHidden:true`. | `[UNVERIFIED live; форма из users.routes.js]` |
| `GET /users/:id/ratings?sort=new\|old\|high\|low` | Вкладка оценок B9: `{ items, pagination }`; элемент — `{ id, film, technicalScore, combinedScore, vibe, completeness, genrePreset, blockWeights, scores, textReview, createdAt }`; vibe имеет `combinedScore:0`, `completeness:'vibe'`. `sort` по умолчанию `new` (createdAt desc); `high/low` — по `combinedScore`, vibe после full. Неизвестный `sort` → `new`. | `[UNVERIFIED live; форма из profileTabsQuery.js]` |
| `GET /users/:id/reviews` | Вкладка рецензий B9: `{ items, pagination }`; элемент — `{ _id, id, film, filmId, ratingId, title, text, isSpoiler, status, likes, createdAt }`; чужие — только approved, свои — все статусы. | `[UNVERIFIED live; форма из profileTabsQuery.js]` |
| `GET /users/:id/comments` | Вкладка комментариев B9: `{ items, pagination }`; элемент — `{ id, film, text, targetType, targetId, target, parentId, likes, status, createdAt }`; для review `target` — `{ id,title,text,isSpoiler,status,createdAt }`. | `[UNVERIFIED live; форма из profileTabsQuery.js]` |
| `GET /users/:id/watches` | Дневник: `{ items, pagination }`; элемент — Watch с populated `filmId { _id,title,poster,year }`. `404 PROFILE_HIDDEN`, `403 DIARY_PRIVATE`. | `[UNVERIFIED live; форма из diaryQuery.js]` |
| `GET /users/:id/watchlist` | Watchlist пользователя: `{ items, pagination }`; элемент — WatchlistItem `{ _id, addedAt, filmId: { _id, title, poster, year } }`. 404 `PROFILE_HIDDEN` для скрытого профиля. | `[UNVERIFIED live; форма из watchlistQuery.js]` |
| `GET /users/me/likes` | «Понравившиеся» текущего пользователя: `{ items, pagination }`; элемент — FilmLike `{ _id, addedAt, filmId: { _id, title, poster, year } }`. | `[UNVERIFIED live; форма из filmLikesQuery.js]` |
| `GET /users/:id/likes` | «Понравившиеся» пользователя: `{ items, pagination }`; элемент — FilmLike `{ _id, addedAt, filmId: { _id, title, poster, year } }`. 404 `PROFILE_HIDDEN` для скрытого профиля. | `[UNVERIFIED live; форма из filmLikesQuery.js]` |
| `GET /users/:id/achievements` | `{ nickname, earned, possible, totalPoints, progress }`; `earned` — строки достижений. | `[UNVERIFIED live; форма из users.routes.js]` |
| `GET /watchlist/user` | Watchlist текущего пользователя: `{ items, pagination }`; элемент — WatchlistItem `{ _id, addedAt, filmId: { _id, title, poster, year } }`. | `[UNVERIFIED live; форма из watchlistQuery.js]` |
| `GET /watchlist/check/:filmId` | `{ inWatchlist: boolean, filmId }`. | `[UNVERIFIED live; форма из watchlist.routes.js]` |
| `GET /watches/user` | Watch текущего пользователя. Конверт не описан. | `[UNVERIFIED: API недоступен; форма не описана]` |
| `GET /users/me/pinned-achievement` | `{ pinnedAchievement: string | null }`; значение возвращается только если оно есть в `user.achievements`, иначе `null`. | `[UNVERIFIED live; форма из users.routes.js]` |

### 3.1 Privacy (B-PRIVACY)

- `GET /users/me/privacy` → `{ hideProfile, hideFromFeed }`.
- `PUT /users/me/privacy` принимает одно или оба поля, возвращает актуальный
  объект. Фронт сохраняет оптимистично и откатывает при ошибке.
- `hideProfile` скрывает профиль от других (`isHidden` / stub), `hideFromFeed`
  исключает действия из ленты; владелец свой скрытый профиль видит полностью.
- Для личных разделов скрытого профиля API отдаёт `404` (а не пустой список).
- Живые ответы прода — `[UNVERIFIED]`; формы подтверждены mock API и браузером
  4.9.

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
- `DELETE /api/ratings/:id` — отмена vibe: `200 {deleted:true, filmId}`;
  full → `400 FULL_RATING_CANNOT_BE_CANCELLED`; чужая/нет → `404 NOT_FOUND`.
- `[UNVERIFIED: прод; мутация не выполнялась]`

### 4.3 Комментарии и рецензии

- `POST /api/comments` — комментарий.
  - Фронт F2 отправляет `{ filmId, text }`. B8: без `targetType` это комментарий
    к фильму, `targetId` берётся как `targetId ?? filmId`.
  - F7 отправляет `{ targetType: 'review', targetId, text, parentId? }`; для
    рецензии гейт по Rating **не применяется** (B8).
  - Без Rating для фильма — `403 RATING_REQUIRED_FOR_COMMENT`; для неопубликованной
    рецензии — `404` посторонним или `403 REVIEW_NOT_PUBLISHED` автору/админу.
  - `parentId` — только на опубликованный корень, один уровень; текст до 1000.
  - Комментарий создаётся со `status: 'pending'`; лайк не гейтится.
  - `[UNVERIFIED: прод; мутация не выполнялась]`
- `GET /api/comments?targetType=film|review&targetId=&page=&limit=` — список
  `{ items, pagination }`; у корней `replies[]`. `targetType` обязателен.
- `GET /api/comments/:filmId` — legacy-массив только для фильма, с `replies[]`.
- `POST /api/reviews` — рецензия.
  - Тело F3: `{ filmId, title, text, isSpoiler }`. `ratingId` не отправляется:
    B4 берёт свою Rating пользователя.
  - Текст 350..15000; без `completeness: 'full'` —
    `403 FULL_RATING_REQUIRED_FOR_REVIEW`; успех — `200` (не 201).
  - `[UNVERIFIED: прод; мутация не выполнялась]`
- `POST /api/comments/:id/like` — `{ liked: true, likes: number }`; свой комментарий
  лайкать нельзя. `POST /api/reviews/:id/like` — форма ответа не описана.
- `[UNVERIFIED: прод; мутация не выполнялась]`

### 4.4 Watch / Watchlist / Likes / достижения

| Метод | Путь | Тело / ответ | Статус |
|---|---|---|---|
| POST | `/watches` | `{ filmId, watchedAt, isRewatch?, tags? }` → `201` Watch; дата `YYYY-MM-DD`, не будущая; теги ≤10×30 | `[UNVERIFIED live; форма из watches.routes.js]` |
| GET | `/watches/me` | свой дневник → `{ items, pagination }`; элемент — Watch с populated `filmId { _id, title, poster, year }` | `[UNVERIFIED live; форма из diaryQuery.js]` |
| GET | `/users/:id/watches` | чужой дневник → `{ items, pagination }`; `404 PROFILE_HIDDEN`, `403 DIARY_PRIVATE` | `[UNVERIFIED live; форма из users.routes.js]` |
| GET | `/watches/:filmId/count` | `{ filmId, count }`; фронт F4 не использует, счётчик берёт из фильма | `[UNVERIFIED live]` |
| DELETE | `/watches/:id` | своя запись по `_id`; ответ `{ deleted: true, id }`; чужая/нет — `404` | `[UNVERIFIED live; форма из watches.routes.js]` |
| POST | `/watchlist` | `{ filmId }` → `200`/`201` `{ inWatchlist: true, filmId, addedAt }` | `[UNVERIFIED live; форма из watchlist.routes.js]` |
| DELETE | `/watchlist/:id` | `:id` — `_id` WatchlistItem, не `filmId`; идемпотентный `200` `{ inWatchlist: false }` | `[UNVERIFIED live; форма из watchlist.routes.js]` |
| POST | `/films/:id/like` | → `{ liked: true, likesCount: number }` | `[UNVERIFIED live; форма из films.routes.js]` |
| DELETE | `/films/:id/like` | → `{ liked: false, likesCount: number }` | `[UNVERIFIED live; форма из films.routes.js]` |
| PUT | `/users/me/pinned-achievement` | `{ achievement: string | null }`; `null` снимает закрепление; строка должна точно совпадать с полученным достижением, иначе `400 ACHIEVEMENT_NOT_EARNED` | `[UNVERIFIED live; форма из users.routes.js]` |

`ACHIEVEMENT_NOT_EARNED` — ожидаемая ошибка при попытке закрепить недостигнутое
достижение; точный статус не подтверждён. `[UNVERIFIED: прод; мутация не выполнялась]`

F4/F5/F6 использует эти ответы так:

- `GET /films/:id` отдаёт `watchesCount`, `liked` и `likesCount`; полей
  `inWatchlist` и «смотрел ли текущий пользователь» нет.
- `GET /auth/me` и `GET /users/:id` отдают `counters.filmLikes`,
  `counters.watchlist` и `counters.watches` — счётчики действий человека (не
  публичный `Film.likesCount`).
- Список галереи — `{ items, pagination }`; фронт листает по 12. Дневник —
  тот же конверт, по 10 на страницу, сортировка `watchedAt` desc.
- Скрытый профиль для чужого зрителя отдаёт `404 PROFILE_HIDDEN` на
  `/users/:id/likes`, `/users/:id/watchlist` и `/users/:id/watches`; закрытый
  дневник — `403 DIARY_PRIVATE`. Фронт в этих случаях не рендерит секции или
  показывает сообщение.
- Удаление из watchlist идёт по `_id` записи WatchlistItem; удаление просмотра —
  по `_id` записи Watch; `filmId` для DELETE не подходит.

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
- Точные конверты остальных списков (`items`/`pagination`/`total`) и поля
  профилей, рецензий, достижений — не описаны в репо; комментарии F2/F7 описаны
  выше и проверены на mock API.
- `RATING_REQUIRED_FOR_COMMENT`, `FULL_RATING_REQUIRED_FOR_REVIEW`,
  `ALREADY_FULL_RATING`, `VIBE_LIMIT_REACHED`, `PROFILE_HIDDEN`,
  `ACHIEVEMENT_NOT_EARNED`, `REVIEW_NOT_PUBLISHED` — ожидания из DECISION
  и/или кода бэкенда, но не живые ответы.
- Формы F2/F3/F4/F5+F6/F7 (`{ filmId, text }`, `{ filmId, title, text, isSpoiler }`,
  `{ filmId, watchedAt, isRewatch, tags }`, `{ filmId }` для watchlist,
  `{ targetType: 'review', targetId, text, parentId? }`,
  DELETE по `_id` WatchlistItem/Watch) подтверждены кодом бэкенда и браузером
  на mock API; живые ответы прода — нет.

---

## 7. Changelog верификации

### 2026-11-03 — 4.9 каталог и навигация

- **Формы подтверждены в браузере на mock API:** 46/46 сценариев
  (`screenshots/design-mopup/`), плюс отдельный backend-тест фильтров 5/5 на
  in-memory MongoDB. Живой прод не проверялся.
- **Каталог:** `GET /films` с `q/genre/yearFrom/yearTo/rated/sort/page/limit` →
  `{ films, pagination, sort }`; `total` после фильтров; `GET /films/facets` →
  `{ genres, years }`.
- **Импорт:** фронт не создаёт `film_add`; единственное событие — на бэкенде
  (`films.routes.js`); после `POST /films/import` фронт сразу открывает
  `/film/:id`.
- **Privacy:** `GET/PUT /users/me/privacy` → `{ hideProfile, hideFromFeed }`;
  inline-панель в профиле, сохранение и откат.
- **Живой API:** по-прежнему недоступен; все live-статусы — `[UNVERIFIED]`.

### 2026-11-03 — F8

- **Формы подтверждены в браузере на mock API:** F8 — 47/47 сценариев.
  Это проверяет фронт, но не живой прод.
- **Карточка:** `GET /users/:id` → `{ user }`; `pinnedAchievement` — одно значение,
  `achievementsCount` — число; legacy-массивов нет.
- **Вкладки:** `/users/:id/{ratings,reviews,comments,watches,watchlist,likes,
  achievements}` → `{items, pagination}` (кроме achievements); свои — `:id=me`,
  но фронт использует `currentUser._id`.
- **Pinned:** `GET /users/me/pinned-achievement` → `{pinnedAchievement}`;
  `PUT /users/me/pinned-achievement {achievement}` заменяет значение или снимает
  `null`; недостигнутое — `400 ACHIEVEMENT_NOT_EARNED`.
- **Приватность:** скрытый профиль — `{user: hiddenProfileStub}`, вкладки не
  рендерятся; 404 на вкладках скрывает секцию, `403 DIARY_PRIVATE` — сообщение.
- **Живой API:** по-прежнему недоступен; статусы live-проверок — `[UNVERIFIED]`.

### 2026-11-02 — F4

- **Форма подтверждена в браузере на mock API:** F4 — 40/40 сценариев.
- **Watch:** `POST /api/watches { filmId, watchedAt, isRewatch, tags }` → `201`;
  дата `YYYY-MM-DD`, не будущая; теги ≤10×30; `GET /watches/me` и
  `GET /users/:id/watches` → `{items, pagination}`; `DELETE /watches/:id` по `_id`
  записи → `{deleted:true,id}`.
- **Счётчик:** `film.watchesCount` из `GET /films/:id`; отдельный
  `GET /watches/:filmId/count` фронт не вызывает.
- **Приватность:** `404 PROFILE_HIDDEN` для скрытого профиля,
  `403 DIARY_PRIVATE` для закрытого дневника.
- **Живой API:** по-прежнему недоступен; статусы live-проверок — `[UNVERIFIED]`.

### 2026-11-02 — F5/F6

- **Формы подтверждены в браузере на mock API:** F5/F6 — 19/19 сценариев.
  Это проверяет фронт, но не живой прод.
- **Лайк:** `POST`/`DELETE /api/films/:id/like`; состояние и счётчик
  `liked/likesCount` приходят из `GET /films/:id`, ответы — `{liked, likesCount}`.
- **Watchlist:** `GET /watchlist/check/:filmId` → `{inWatchlist, filmId}`;
  `POST /watchlist {filmId}` → `{inWatchlist:true, filmId, addedAt}`;
  `DELETE /watchlist/:id` принимает `_id` WatchlistItem, не `filmId`;
  список — `{items,pagination}` с `filmId:{_id,title,poster,year}`.
- **Галереи:** `/users/me/likes`, `/users/:id/likes`, `/watchlist/user`,
  `/users/:id/watchlist` → `{items,pagination}`; скрытый профиль — 404.
- **Счётчики:** `counters.filmLikes` и `counters.watchlist` в шапке профиля;
  удаление из watchlist обновляет и секцию, и шапку.
- **Живой API:** по-прежнему недоступен; статусы live-проверок — `[UNVERIFIED]`.

### 2026-11-01 — F2/F3

- **Формы подтверждены в браузере на mock API:** F2 — 22/22 сценария,
  F3 — 29/29, F4 — 40/40, F5+F6 — 19/19, F7 — 16/16. Это проверяет фронт,
  но не живой прод.
- **F2:** `POST /api/comments` уходит как `{ filmId, text }`; 403
  `RATING_REQUIRED_FOR_COMMENT` ловится по `errorCode`, текст сохраняется.
- **F3:** `POST /api/reviews` уходит как `{ filmId, title, text, isSpoiler }`;
  `ratingId` отсутствует; 403 `FULL_RATING_REQUIRED_FOR_REVIEW` ловится по
  `errorCode`, текст и чекбокс сохраняются.
- **F4:** `POST /api/watches` уходит как `{ filmId, watchedAt, isRewatch, tags }`;
  `GET /watches/me` и `/users/:id/watches` — `{ items, pagination }`.
- **F5+F6:** лайк — `POST`/`DELETE /films/:id/like`; watchlist —
  `POST /watchlist { filmId }`, `DELETE /watchlist/:id` по `_id`; отдельный
  `GET /watchlist/check/:filmId`.
- **F7:** `GET /comments?targetType=review&targetId=...` — `{ items, pagination }`;
  `POST /comments` — `{ targetType: 'review', targetId, text, parentId? }`;
  гейта по `userRating` нет, лайк — `POST /comments/:id/like`.
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
