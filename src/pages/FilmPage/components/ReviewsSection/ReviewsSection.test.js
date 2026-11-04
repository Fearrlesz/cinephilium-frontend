import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import ReviewsSection from './ReviewsSection';

// Регресс: у старой рецензии ratingId может быть null (оценку удалили).
// typeof null === 'object', поэтому без явной проверки на null чтение
// rating.combinedScore роняет всю страницу фильма в белый экран.
test('рецензия без оценки (ratingId = null) не роняет страницу фильма', () => {
  const reviews = [
    {
      _id: 'review-1',
      title: 'Рецензия без оценки',
      text: 'Текст рецензии',
      userId: { _id: 'user-1', nickname: 'critic' },
      ratingId: null,
      likes: []
    }
  ];

  expect(() =>
    renderToString(
      <MemoryRouter>
        <ReviewsSection
          reviews={reviews}
          currentUser={null}
          film={{ _id: 'film-1', title: 'Начало' }}
          userRating={null}
          onLikeReview={() => {}}
        />
      </MemoryRouter>
    )
  ).not.toThrow();
});
