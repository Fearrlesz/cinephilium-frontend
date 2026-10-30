import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../../utils/ratingUtils';
import './CommentsSection.css';

function CommentsSection({ comments, currentUser, film, onAddComment, onLikeComment }) {
  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');

  const initial = (currentUser?.nickname || '?').charAt(0).toUpperCase();

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

  const handleSubmit = event => {
    event.preventDefault();
    handleAddComment();
  };

  return (
    <section className="film-comments">
      <h2 className="sec-title">
        Комментарии <span className="sec-count">{comments.length}</span>
      </h2>

      {currentUser ? (
        <form className="cform" onSubmit={handleSubmit}>
          <span className="c-av" aria-hidden="true">{initial}</span>
          <input
            className="c-input" type="text" placeholder="Написать комментарий…" value={commentText}
            onChange={event => {
              setCommentText(event.target.value);
              setCommentError('');
            }}
            aria-label="Текст комментария"
          />
          <button className="c-send" type="submit">Отправить</button>
        </form>
      ) : (
        <p className="c-login">
          <Link to="/login">Войдите</Link>, чтобы комментировать.
        </p>
      )}

      {commentError && <p className="c-error" role="alert">{commentError}</p>}

      <ul className="clist">
        {comments.map(comment => {
          const author = comment.userId || {};
          const nickname = author.nickname || 'Пользователь';
          const authorInitial = nickname.charAt(0).toUpperCase();

          return (
            <li className="citem" key={comment._id} id={comment._id}>
              <span className="c-av" aria-hidden="true">{authorInitial}</span>
              <div className="cmain">
                <div className="cname">
                  {nickname}
                  {author.isAdmin && <span className="badge-admin">админ</span>}
                </div>
                <div className="cmeta">
                  <span>@{nickname}</span>
                  {comment.createdAt && (
                    <>
                      <span className="dot">·</span>
                      <span className="c-time">{formatDate(comment.createdAt)}</span>
                    </>
                  )}
                </div>
                <p className="ctext">{comment.text}</p>
                <button
                  className="c-like" type="button" onClick={() => onLikeComment(comment._id)}
                >
                  Полезно <span>{comment.likes?.length || 0}</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default CommentsSection;
