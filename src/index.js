import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/typography.css';
import './App.css';
import App from './App';

// DECISION: единая точка входа стилей — index.js. Порядок фиксирован:
// tokens -> base -> typography -> App.css. App.css оставлен последним,
// чтобы унаследованные стили страниц могли переопределять базу. Импорт
// App.css перенесён из App.js, иначе порядок зависел бы от глубины графа.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
