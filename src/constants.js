// src/constants.js

export const SPECIAL_FILMS = {
  'Догвилль': {
    id: 'dogville_overton',
    title: 'Окно Овертона',
    icon: '⭐',
    description: 'Первый разбор — Догвилль, 07.08.2026',
    deadline: new Date('2026-08-07T23:59:59+03:00'),
    cssClass: 'film-dogville'
  }
};

export const SPECIAL_FILM_TITLES = Object.keys(SPECIAL_FILMS);
