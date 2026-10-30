# Cinephilium — дизайн-хендофф

**Дата:** 30.10.2026  
**Ветка:** `feature/f1-vibe-rating`  
**Задача:** полный редизайн страницы фильма и глобального слоя: бордо + azure/cyan,
плоские поверхности, без стекла, неона и эмодзи.

Этот файл — точка входа для агента, который работает **только над дизайном** и не
видел предыдущий контекст. Все значения ниже сняты с кода, а не с макета.

---

## 0. TL;DR

- Основа — бордо: `void → canvas → surface`. Действие — azure. Сильные данные — cyan.
- Розовый только в трёх смыслах: аура бренда, негативная дельта, грейд S.
- Страница фильма: фиксированный хедер 56px, герой 55vh, постер 2/3, панель
  трёх оценок, рецензии/комментарии плоскими секциями на разделителях.
- Никаких `.glass-card`-платформ, `backdrop-filter` на карточках, золота, неона,
  цветных glow-теней и эмодзи.
- Источник значений — `src/styles/tokens.css`. Не хардкодить hex в компонентах.
- Legacy-страницы перекрашены через алиасы в `src/App.css`; их компоновка пока
  старая. Новые дизайн-задачи делать на токенах и классах из `src/styles/`.

---

## 1. Где что лежит

| Файл | Роль |
|---|---|
| `src/styles/tokens.css` | `:root`, все цвета, шрифты, радиусы, тайминги |
| `src/styles/base.css` | `body`, фон-градиент, SVG-шум, reset, selection, focus, скроллбар |
| `src/styles/typography.css` | `.h1`, `.h-section`, `.body`, `.body-review`, `.synopsis`, `.num-big`, `.lbl`, `.tagline`, `.divider` |
| `src/App.css` | глобальные алиасы старых токенов, `.container`, плоские `.glass-card`, кнопки, generic modal |
| `src/components/Header.jsx/.css` | фиксированный хедер, бренд-аура, навигация |
| `src/pages/FilmPage/FilmPage.jsx/.css` | герой, постер, layout, сайдбар, users-modal |
| `src/pages/FilmPage/components/FilmInfo.jsx/.css` | тэглайн, h1, мета, синопсис |
| `.../RatingPanel.jsx/.css` | соцдоказательство, три колонки, вайб-трек, спектр |
| `.../CriteriaModal.jsx/.css` | оболочка модалки критериев |
| `.../RatingForm.jsx/.css` | жанр, веса, критерии, preview, save |
| `.../ReviewsSection.jsx/.css` | рецензии без карточки |
| `.../CommentsSection.jsx/.css` | комментарии без карточки |
| `.../UsersList.jsx/.css` | «Оценили фильм» компактным рядом |
| `src/utils/scoring.js` | грейды S/A/B/C/D/E и цвета |

Порядок подключения в `src/index.js`:

```js
import './styles/tokens.css';
import './styles/base.css';
import './styles/typography.css';
import './App.css';
import App from './App';
```

---

## 2. Палитра — точные значения

### Фоны

| Токен | Значение | Назначение |
|---|---|---|
| `--void` | `#0a0709` | самый низ, body, модальный оверлей |
| `--canvas` | `#130d11` | верхний градиент body |
| `--surface` | `#1e151b` | карточки, модалки, пилюли |
| `--surface-2` | `#251a22` | выпадающие меню, tooltip |
| `--elevated` | `#2a1a22` | приподнятые поверхности |
| `--highlight` | `#3a2430` | аватары, бренд-подложка |

### Текст

| Токен | Значение | Назначение |
|---|---|---|
| `--ink` | `#f0ebe4` | заголовки, главный текст |
| `--ink-soft` | `#cfc6c6` | body |
| `--ink-muted` | `#a89aa0` | подписи, навигация |
| `--ink-faint` | `#8f8289` | лейблы, placeholder, метаданные |

### Линии

| Токен | Значение |
|---|---|
| `--line-faint` | `rgba(237, 232, 224, 0.06)` |
| `--line` | `rgba(237, 232, 224, 0.10)` |
| `--line-strong` | `rgba(237, 232, 224, 0.16)` |

Правило: рамки и разделители — только через эти три токена. Никаких серых hex.

### Акценты

| Токен | Значение | Смысл |
|---|---|---|
| `--azure` | `#5b9bd5` | действие, интерактив, активное состояние |
| `--azure-bright` | `#7eb8ea` | hover, оценка пользователя |
| `--azure-soft` | `rgba(91, 155, 213, 0.10)` | фон CTA/активных полей |
| `--azure-line` | `rgba(91, 155, 213, 0.38)` | активные поля, левая полоса цитат |
| `--cyan` | `#5fc9d4` | сильные данные, установленное значение |
| `--cyan-bright` | `#7dd9e3` | положительная дельта, установленный thumb |
| `--cyan-soft` | `rgba(95, 201, 212, 0.10)` | мягкая подсветка |
| `--pink` | `#d68aa6` | ТОЛЬКО аура бренда, негативная дельта, грейд S |
| `--pos-delta` | `var(--cyan-bright)` | положительная дельта |

### Грейды (из `getGrade` в `src/utils/scoring.js`)

| Грейд | Порог | Цвет | Подпись |
|---|---|---|---|
| S | ≥ 90 | `#d68aa6` | Шедевр |
| A | ≥ 80 | `#7dd9e3` | Отлично |
| B | ≥ 65 | `#5fc9d4` | Хорошо |
| C | ≥ 50 | `#5b9bd5` | Средне |
| D | ≥ 35 | `#8f8289` | Слабо |
| E | < 35 | `#a86a72` | Провал |

### 5 блоков критериев (`tokens.css` + `BLOCK_COLORS`)

| Блок | `cg` | `c1 → c2` |
|---|---|---|
| Сценарий | `#7dd9e3` | `#7dd9e3 → #4fb8c4` |
| Персонажи | `#5fc9d4` | `#5fc9d4 → #3fa5b2` |
| Визуал | `#5b9bd5` | `#5b9bd5 → #3a7ab8` |
| Звук | `#8b88d4` | `#8b88d4 → #6a66b8` |
| Стиль | `#d68aa6` | `#d68aa6 → #b86c88` |

Токены: `--block-<key>-cg`, `--block-<key>-c1`, `--block-<key>-c2`.

---

## 3. Семантика — что каким цветом

- **azure** — «можно нажать / выбрано»: CTA, фокус, активная ссылка, границы
  инпутов при фокусе, цифра «Ваша».
- **cyan** — «сильные данные / установлено»: положительная дельта, thumb вайба,
  активные сегменты, грейд A/B, бары спектра.
- **pink** — только бренд-аура, негативная дельта, грейд S. Не использовать как
  обычный акцент.
- **ink-faint** — лейблы и метаданные. Не делать ими основной текст.
- Все числа и лейблы — mono. Все предложения — Inter. Имя фильма / h1 — serif.

---

## 4. Градиенты

Разрешены только:

1. **Body:** `linear-gradient(180deg, var(--canvas) 0, var(--void) 480px)` + `var(--void)`.
2. **Вайб-трек:** `linear-gradient(90deg, #6b4a5a 0, #5b9bd5 40%, #5fc9d4 70%, #7dd9e3 100%)`.
3. **Бренд-аура:** три радиальных пятна cyan/azure/pink, `screen`, blur.
4. **Постер/фон героя:** затемнение `linear-gradient(to top, rgba(10,7,9,.5), transparent 36%)`.

Фоновых градиентов на кнопках, карточках и секциях нет. Только сплошные
`surface`/`void` и линии.

---

## 5. Типографика

Шрифты:

- `--serif`: `'Instrument Serif', Georgia, 'Times New Roman', serif` — только h1.
- `--sans`: `'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif` — body/UI.
- `--mono`: `'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace` —
  все числа, лейблы, метаданные.

Google Fonts в `public/index.html` — ровно три семейства:
`Instrument Serif ital@0;1`, `Inter 300–900`, `IBM Plex Mono 400/500/600`,
`display=swap`.

Классы (`typography.css`):

| Класс | Размер/стиль |
|---|---|
| `.h1` | Instrument Serif 64px / 400 / 1 / -0.01em / ink; 48px ≤1024; 40px ≤768; 32px ≤480 |
| `.h-section` | Inter 17px / 600 / -0.012em / ink |
| `.body` | Inter 15px / 1.7 / ink-soft |
| `.body-review` | Inter 15px / 1.75 / ink-soft |
| `.synopsis` | Inter 16px / 1.7 / ink-soft |
| `.num-big` | mono 38px / 500 / -0.04em / 1 / ink; 32px ≤768; 30px ≤480 |
| `.lbl` | mono 11px / 500 / .13em / uppercase / ink-faint |
| `.tagline` | mono 12px / .15em / uppercase / ink-muted |
| `.divider` | width 100%, height 1px, `line-faint` |

Важно: `.num-big` — общий класс. Число вайба 40px живёт в `RatingPanel.css`
(`.rp-col[data-col="vibe"] .rp-num`), не в типографике.

---

## 6. Радиусы, контейнер, движение

| Токен | Значение |
|---|---|
| `--r-xs` | `4px` — мелкие инпуты, чипы |
| `--r-sm` | `6px` — карточки, кнопки |
| `--r-md` | `10px` — постер, крупные поверхности |
| `--r-lg` | `14px` — модалки |
| `--wrap` | `1180px` |
| `--ease` | `cubic-bezier(.33, 0, .2, 1)` |
| `--dur-fast` | `0.16s` — hover |
| `--dur-mid` | `0.2s` |
| `--dur-slow` | `0.3s` — трансформации/появления |

Контейнер: max-width 1180px, боковые паддинги 24px. На ≤480 — 16px.

---

## 7. Брейкпоинты

Только эти числа в media queries:

`1024 / 860 / 768 / 620 / 520 / 480`

Они зафиксированы в `tokens.css` комментарием и в README. Новые не придумывать.
CSS-переменные в media queries CRA 5 не поддерживает.

---

## 8. Хедер

`src/components/Header.jsx/.css`, класс `.hdr`.

- fixed, height `56px`, z-index `800`.
- фон `rgba(19, 13, 17, 0.74)`, `backdrop-filter: blur(14px) saturate(1.1)`,
  нижняя граница `1px solid var(--line-faint)`.
- `.hdr-in`: flex, gap 30px, max-width 1180, padding 0 24.
- Бренд: только слово `Cinephilium`, mono 11.5/500/.22em uppercase, ink.
  Два слоя ауры через `::before` и `::after`; никаких иконок и квадратов.
  Анимация дыхания 7s; при `prefers-reduced-motion` отключается.
- Навигация: mono 11.5/500/.10em uppercase, ink-muted; активная — ink +
  подчёркивание 1px azure.
- Тулзы: avatar 24px, border `line`; текст-кнопки mono 10.5 uppercase.
- ≤768: навигация скрыта, бренд + тулзы.

---

## 9. Страница фильма

`FilmPage.jsx`:

```jsx
<div className="film-page">
  <Header user={currentUser} />
  <section className="film-hero">
    <div className="film-hero-bd ..." />
    <div className="film-hero-in">
      <div className="film-poster-col">...</div>
      <FilmInfo film={film}>
        <RatingSection ... />
      </FilmInfo>
    </div>
  </section>
  <main className="film-layout">
    <div className="film-main">UsersList, trailer, ReviewsSection, CommentsSection</div>
    <aside className="film-side">жанры, факты</aside>
  </main>
</div>
```

Ключевые размеры:

- `.film-hero`: padding-top 56, нижняя граница `line-faint`.
- `.film-hero-bd`: absolute, top 0, height 55vh, min 360; картинка cover/center 20%;
  затемнение `rgba(10,7,9,.2) → .6 → #0a0709`.
- `.film-hero-in`: grid `340px 1fr`, gap 48, padding
  `max(24px, calc(55vh - 120px)) 24px 56px`.
- `.film-poster-col`: padding-top 72 (постер ниже заголовка).
- `.film-poster`: aspect 2/3, border `line-strong`, radius `r-md`, `surface`,
  тени `0 40px 80px -20px rgba(0,0,0,.9)` и `0 0 40px rgba(91,155,213,.05)`.
- `.film-layout`: grid `minmax(0,1fr) 300px`, gap 48, padding `44px 24px 90px`.
- Без backdrop-картинки: `.film-hero.no-image` уменьшает пустоту
  (clamp 24/…/280 + фон 420px).
- Адаптив: ≤1024 — постер 280, gap 32, сайдбар в 2 колонки; ≤768 — одна колонка,
  постер 180; ≤620 — сайдбар в 1; ≤480 — паддинги 16.

### Соцдоказательство

`.rating-context` — inline-flex, padding 12/20, `surface`, border `line`,
radius `r-sm`, gap 20. Внутри «Сообщество / Ваша / Дельта».
Числа mono 16/500; «Ваша» — azure-bright; delta `pos-delta` / pink.

### Панель трёх оценок

`.rating-panel`: grid `1fr 1.4fr 1fr`, max-width 800, border-top `line-faint`,
padding-top 20. Колонки padding `0 22`, соседние — border-left `line-faint`.
Заголовки — mono 9.5/.11em uppercase ink-faint; community — mono 9.5.

- Число: 38px mono / 500 / -0.04em; вайб — 40px; ≤768 — 32/34; ≤480 — 30.
- Грейд — пилюля: border currentColor, mono 12/600 letter, label mono 9.5/.11em.
- Спектр: 5 строк, grid `1fr 78px 30px`; имя mono 9/.08em; бар 6px на `line-faint`;
  значение mono 11/600 ink-soft.
- CTA: фон `azure-soft`, рамка `azure-line`, mono 10.5/.1em uppercase.
- Формула: mono 10.5/1.55 ink-muted, `b` — ink 500.

### Вайб-трек

`.vibe-track` 30px, padding 0 10; rail 8px radius 4, фон `rgba(237,232,224,.07)`,
inset-тень; fill — градиент из §4, opacity .32 без значения и 1 с значением;
thumb 20px, border 2px ink-faint, при значении — cyan-bright + shadow
`0 0 0 4px rgba(95,201,212,.14), 0 2px 10px rgba(0,0,0,.55)`.
На coarse pointer — 10 сегментов `.vibe-segment` (30px, radius r-xs).

### Рецензии

`.film-reviews`: margin-top 46, padding-top 26, border-top `line-faint`.
`.rev`: padding 26 0, border-top `line-faint`; первый без верхней.
Аватар 32px, автор Inter 14/600 ink, handle/date mono 11 ink-faint, score mono 16
с `/100` mono 11. Ключевая мысль — Inter 15/600 ink, border-left `azure-line`,
padding-left 13. Body — Inter 15/1.75 ink-soft, max 64ch, clamp 4 строки.
«Показать полностью +» — mono 10.5 uppercase ink-faint. Действия — mono 10
uppercase ink-faint. Никакой карточки, фона и тени.

### Комментарии

`.film-comments`: margin-top 46, padding-top 26, border-top `line-faint`.
Форма: flex gap 10, аватар 28, input-пилюля radius 100 border `line`,
focus `azure-line`, кнопка azure/void mono? — Inter 11.5/600 uppercase.
Список: `.citem` flex gap 10, padding 14 0, border-top `line-faint`; аватар 26;
имя 13/600; мета mono 10.5; текст 13.5/1.65. На ≤620 время скрывается,
на ≤480 форма переносится.

### Сайдбар

`.film-side` 300px; `.chip` — padding 5/11, radius 100, border `line`,
Inter 12.5/500. `.side-facts` — grid 86px/1fr, разделители `line-faint`,
dt mono 9.5/.11em uppercase ink-faint, dd Inter 13.5/1.55.

---

## 10. Модалка критериев

- `.modal-overlay`: fixed, `rgba(10,7,9,.86)`, `backdrop-filter: blur(6px)`,
  z-index 9500, padding 24.
- `.modal-content`: max-width 600, max-height 90vh, padding 26, `surface`,
  border `line-strong`, radius `r-lg`, тень `0 40px 90px rgba(0,0,0,.9)`.
- Кикер — mono 10.5/.15em uppercase ink-muted; заголовок Inter 20/600;
  саб Inter 12.5 ink-faint.
- Инпуты/select — padding 11/13, border `line`, radius `r-sm`, focus `azure-line`.
- Кнопка сохранения — height 42, фон azure, текст void, Inter 11.5/600 uppercase,
  disabled opacity .42.
- Слайдер критерия — 2px-линия:
  `linear-gradient(90deg, var(--fc) var(--fill), var(--line) var(--fill))`,
  thumb 12px, фон ink.
- Аккордеон: `.crit` с border-top `line-faint`; маркер 6×6 radius 2 цветом блока;
  title Inter 13.5/500; average mono 12; `+ / −` mono 13.
- Веса: полоса 18px radius r-xs, сегменты цветами блоков; сумма ровно 100,
  иначе сохранение disabled и предупреждение pink.

---

## 11. Legacy-слой

`src/App.css` больше не содержит старой палитры. Старые имена оставлены
алиасами на новые токены, чтобы не ломать ещё не переписанные страницы:

```css
--bg-deep: var(--void);
--bg-glass: var(--surface);
--text-primary: var(--ink);
--text-secondary: var(--ink-soft);
--text-muted: var(--ink-faint);
--gold: var(--azure);
--gold-bright: var(--azure-bright);
--neon-purple: var(--cyan);
--neon-cyan: var(--cyan-bright);
--neon-pink: var(--pink);
--glass-border: var(--line);
--font-sans: var(--sans);
--font-mono: var(--mono);
```

`.glass-card`, `.criteria-block`, `.vibe-block` теперь плоские: `surface`, border
`line`, radius `r-md`, padding 24, без blur/тени. HomePage/Profile/Login и т.д.
перекрашены, но их компоновка не переписывалась — это следующий этап.

---

## 12. Запрещено

- Возвращать золото, неон, фиолетовый, «стекло», `backdrop-filter` на карточках.
- Добавлять цветные glow-тени (кроме разрешённых мягких azure-теней постера и
  cyan-shadow thumb).
- Использовать pink как обычный акцент.
- Хардкодить hex/размеры в компонентах, если есть токен.
- Добавлять эмодзи в UI.
- Использовать шрифты вне трёх семейств.
- Придумывать новые брейкпоинты.
- Менять F1-логику: `combined` только для full, vibe-only — прочерки,
  веса строго 100, `vibe × 10` не возвращать.

---

## 13. Как добавить новый компонент

1. Цвета/шрифты/радиусы — только `var(--…)` из `tokens.css`.
2. Фон — `var(--surface)` или прозрачный; рамка — `var(--line)`; разделитель —
   `var(--line-faint)`.
3. Числа/лейблы — `var(--mono)`; текст — `var(--sans)`; h1 — `var(--serif)`.
4. Кнопка-действие — azure; данные/установленное — cyan.
5. Не добавлять карточку, если хватает секции с border-top.
6. Проверить 480/620/768/1024.
7. `npm run build` — обязательно.

---

## 14. Проверка и артефакты

- `npm run build` — `Compiled successfully`.
- CSS bundle ≈ 23.5 kB gzip, JS ≈ 115 kB gzip.
- Скриншоты: `screenshots/film-redesign/`:
  `before-after.png`, `top.png`, `feed.png`, `modal.png`, `modal-bottom.png`.
- Скриншоты сняты с production-сборки на mock API; Google Fonts в песочнице
  недоступны, поэтому на кадрах fallback-шрифт.

---

## 15. Известные границы

- HomePage, Profile, Login, About, Admin, Critic и остальные страницы
  перекрашены через алиасы, но их сетки/компоновки — старые.
- `RatingDetailsModal` использует общий `modal-content` и стили из
  `FilmPage.css`; при выносе на другие страницы проверить.
- F1-хуки и API не менялись. Контракт — в `AGENT_CONTEXT.md` §5–§6.
