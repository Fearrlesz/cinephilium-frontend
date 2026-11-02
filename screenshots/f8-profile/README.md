# F8 — вкладки профиля и плоский дизайн, скриншоты

- `own-card.png` — свой профиль: карточка, шесть счётчиков, закреплённое
  достижение, число достижений, disabled-кнопка «Редактировать».
- `tab-ratings.png` — вкладка «Оценки»: 12 карточек, постер/название/год/балл,
  vibe показывает прочерк; «Загрузить ещё».
- `tab-reviews.png` — «Рецензии»: плоские секции, статус, спойлер-плашка,
  лайки; pending своего виден.
- `tab-comments.png` — «Комментарии»: источник и `targetType` (фильм/рецензия),
  текст, статус, пагинация.
- `tab-diary.png` — «Дневник»: месячные группы, постер, дата, «Пересмотр», теги,
  удаление только у своего.
- `tab-watchlist.png` — «Watchlist»: галерея, hover-оверлей, удаление у своего.
- `tab-likes.png` — «Понравившиеся»: галерея без удаления.
- `tab-achievements.png` — «Достижения»: сетка, кнопки «Закрепить»/«Открепить»
  только у своего.
- `other-card.png` — чужой профиль: без own-marker, без pinned-кнопок.
- `hidden.png` — скрытый профиль: заглушка с ником/аватаром, вкладок нет.
- `empty.png` — пустая вкладка «Оценки» с текстом для чужого профиля.
- `adaptive-1024.png`, `adaptive-768.png`, `adaptive-620.png`, `mobile-480.png` —
  адаптив; `mobile-ratings-480.png` — сетка оценок в 2 колонки.
- Плоский дизайн: до F8 в `ProfilePage.css` были `backdrop-filter`, `glass-card`,
  `box-shadow`, `translateY`, `scale` и transitions 0.3s. После — только
  `border`/`line-faint`, `surface`/`void`, hover-цвет и transitions ≤0.16s;
  проверено computed styles (`.profile-card`, `.profile-tab`, `.profile-rating-card`:
  `box-shadow: none`, `backdrop-filter: none`, `transform: none`,
  `transition: 0s`/`0.16s`). Старый профиль в этой ветке уже перезаписан, поэтому
  «до» зафиксировано по diff CSS/коммиту `bbd6491`, а не отдельным скриншотом.

Условия: production-сборка с локальным mock API, Chrome headless/CDP, viewport
1440×1000 (мобильный — 480px). Google Fonts в песочнице недоступны — системный
fallback; на структуру, цвета и поведение это не влияет.
