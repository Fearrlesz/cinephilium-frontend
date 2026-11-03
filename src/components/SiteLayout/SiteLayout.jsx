import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../Header/Header';

// DECISION: одна общая шапка для всех публичных страниц. Страницы больше не
// рендерят Header сами и не тащат user через props; у auth/admin свои оболочки.
function SiteLayout() {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
}

export default SiteLayout;
