export const CRITERIA_CONFIG = [
  { key:'scenario', name:'📋 Сценарий и драматургия', criteria:[
    { key:'plot', name:'Сюжетная архитектура', hint:'Логика событий, завязка-развязка, причинно-следственные связи.' },
    { key:'ideas', name:'Идейная нагрузка', hint:'Понятность целей героев, развитие темы, вложенный смысл.' },
    { key:'dialogue', name:'Диалоги и подтекст', hint:'Естественность речи, скрытые смыслы, многослойность.' }]},
  { key:'characters', name:'👥 Персонажи и актёрская игра', criteria:[
    { key:'depth', name:'Глубина и эволюция', hint:'Внутренние конфликты, трансформация под давлением, развитие героев.' },
    { key:'chemistry', name:'Химия и органика', hint:'Мимика, паузы, взгляды, естественность взаимодействия.' },
    { key:'functionality', name:'Функциональность', hint:'Каждый персонаж важен для сюжета, нет ли лишних?' }]},
  { key:'visual', name:'🎥 Режиссура и визуальный язык', criteria:[
    { key:'composition', name:'Композиция и символизм', hint:'Продуманность и эстетичность кадра, визуальные метафоры.' },
    { key:'cinematography', name:'Операторская работа и монтаж', hint:'Движение камеры, ритм склеек, работают ли они на смысл?' },
    { key:'pacing', name:'Темп и ритм', hint:'Динамика, удержание внимания, соответствие жанру.' },
    { key:'tone', name:'Эмоциональная целостность', hint:'Фильм держит единое настроение или разваливается?' }]},
  { key:'sound', name:'🔊 Звук и атмосфера', criteria:[
    { key:'music', name:'Музыка и тишина', hint:'Передача эмоций через музыку, подходит ли она фильму, используется ли тишина как приём?' },
    { key:'design', name:'Звуковой дизайн', hint:'Работа шумов для погружения, соответствие эпохе.' },
    { key:'narrative', name:'Нарративный звук', hint:'Вклад звука в историю: масштаб, тревога, интимность.' }]},
  { key:'style', name:'✍️ Авторский стиль', criteria:[
    { key:'originality', name:'Индивидуальность', hint:'Уникальный голос режиссёра, авторский почерк.' },
    { key:'boldness', name:'Художественная смелость', hint:'Риск формой, жанром, нарративом.' }]}
];

export const GENRE_LABELS = {
  drama:'Драма / Арт-хаус', action:'Экшн / Блокбастер', comedy:'Комедия',
  horror:'Хоррор / Триллер', scifi_block:'Sci-Fi / Фэнтези (блокбастер)',
  scifi_author:'Sci-Fi / Фэнтези (авторский)', musical:'Мюзикл',
  biopic:'Байопик', hybrid:'🎛 Свои веса'
};

export const BLOCK_NAMES = ['Сценарий', 'Персонажи', 'Визуал', 'Звук', 'Стиль'];

export const PRESET_WEIGHTS = {
  drama:        [25, 20, 20, 15, 20],
  action:       [20, 20, 30, 20, 10],
  comedy:       [30, 30, 15, 15, 10],
  horror:       [25, 20, 20, 25, 10],
  scifi_block:  [25, 20, 25, 20, 10],
  scifi_author: [25, 20, 20, 15, 20],
  musical:      [20, 20, 20, 30, 10],
  biopic:       [30, 30, 20, 15, 5],
  hybrid:       null
};

export const MIN_SCORE = 10;
export const MAX_SCORE = 100;
export const TECHNICAL_MULTIPLIER = 0.7;
export const VIBE_STEP = 0.3;

export const VALID_EVENT_TYPES = ['rating', 'review', 'comment', 'film_add', 'achievement'];
export const VALID_FILM_TYPES = ['view', 'like', 'rating', 'comment', 'share', 'favorite'];

export function getScoreColor(score) {
  const ratio = (score - MIN_SCORE) / (MAX_SCORE - MIN_SCORE);
  const hue = ratio * 120;
  return `hsl(${hue}, 70%, 50%)`;
}
