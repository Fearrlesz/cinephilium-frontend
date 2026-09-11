import React, { useState } from 'react';
import './ReviewsSection.css';

function ReviewsSection({ reviews, currentUser, film, userRating, onAddReview, onLikeReview }) {
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ title: '', text: '' });

  const handleAddReview = () => {
    const trimmedTitle = newReview.title.trim();
    const trimmedText = newReview.text.trim();
    if (!trimmedTitle || !trimmedText) {
      // уведомление будет в родителе
      return;
    }
    onAddReview(trimmedTitle, trimmedText);
    setNewReview({ title: '', text: '' });
    setShowReviewForm(false);
  };

  return (
    <div className="reviews-section glass-card">
      <div className="reviews-header">
        <h3>📝 Рецензии ({reviews.length})</h3>
        {currentUser && (
          <button className="btn-add-review" onClick={() => setShowReviewForm(prev => !prev)}>
            {showReviewForm ? 'Отменить' : '+ Написать рецензию'}
          </button>
        )}
      </div>

      {showReviewForm && (
        <div className="review-form">
          <input
            type="text"
            placeholder="Заголовок рецензии"
            value={newReview.title}
            onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
          />
          <textarea
            placeholder="Текст рецензии..."
            value={newReview.text}
            onChange={(e) => setNewReview({ ...newReview, text: e.target.value })}
            rows="6"
          />
          <button onClick={handleAddReview}>Опубликовать рецензию</button>
        </div>
      )}

      <div className="reviews-list">
        {reviews.map((review) => (
          <div key={review._id} id={review._id} className="review-card">
            <div className="review-header">
              <div className="review-author">
                <span className="review-nickname">{review.userId?.nickname || 'Пользователь'}</span>
                {review.userId?.isAdmin && <span className="admin-badge">👑</span>}
              </div>
              <div className="review-rating">
                ⭐ {review.ratingId?.finalScore || 'Нет оценки'}
              </div>
            </div>
            <h4 className="review-title">{review.title}</h4>
            <p className="review-text">{review.text}</p>
            <div className="review-actions">
              <button className="like-btn" onClick={() => onLikeReview(review._id)}>
                ❤️ {review.likes?.length || 0}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReviewsSection;
