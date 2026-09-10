import React, { useState } from 'react';

function CommentsSection({ comments, currentUser, film, onAddComment, onLikeComment }) {
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');

  const handleAddComment = () => {
    const trimmed = commentText.trim();
    if (!trimmed) {
      setCommentError('Введите текст комментария');
      return;
    }
    if (trimmed.length < 2) {
      setCommentError('Комментарий должен содержать минимум 2 символа');
      return;
    }
    setCommentError('');
    onAddComment(trimmed);
    setCommentText('');
  };

  return (
    <div className="comments-section glass-card">
      <h3>💬 Комментарии ({comments.length})</h3>
      <div className="comments-list">
        {comments.map((comment) => (
          <div key={comment._id} id={comment._id} className="comment-item">
            <div className="comment-author">
              <span className="comment-nickname">{comment.userId?.nickname || 'Пользователь'}</span>
              {comment.userId?.isAdmin && <span className="admin-badge">👑</span>}
            </div>
            <p className="comment-text">{comment.text}</p>
            <div className="comment-actions">
              <button className="like-btn" onClick={() => onLikeComment(comment._id)}>❤️ {comment.likes?.length || 0}</button>
            </div>
          </div>
        ))}
      </div>
      {currentUser && (
        <div className="comment-form">
          <input
            type="text"
            placeholder="Написать комментарий..."
            value={commentText}
            onChange={(e) => { setCommentText(e.target.value); setCommentError(''); }}
            onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
          />
          <button onClick={handleAddComment}>📤</button>
          {commentError && <div className="error-msg">{commentError}</div>}
        </div>
      )}
    </div>
  );
}

export default CommentsSection;
