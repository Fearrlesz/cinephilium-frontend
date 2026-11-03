import React, { useEffect, useState } from 'react';
import api from '../../api/client';

const ROWS = [
  {
    field: 'hideProfile',
    label: 'Скрыть профиль',
    hint: 'Другие увидят только ник и аватар. Ваши оценки и дневник останутся видны вам.',
  },
  {
    field: 'hideFromFeed',
    label: 'Не показывать в ленте',
    hint: 'Ваши оценки, рецензии и отметки не появятся в «Последних событиях».',
  },
];

function ProfileSettings({ onPrivacyChange }) {
  const [open, setOpen] = useState(false);
  const [privacy, setPrivacy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || privacy) return undefined;

    let cancelled = false;
    setLoading(true);
    setError('');

    api.get('/users/me/privacy')
      .then(response => {
        if (!cancelled) setPrivacy(response.data);
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить настройки приватности');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, privacy]);

  const toggle = async (field) => {
    if (!privacy || saving) return;

    const previous = privacy[field];
    const nextValue = !previous;
    setError('');
    setSaving(field);
    setPrivacy(current => ({ ...current, [field]: nextValue }));

    try {
      await api.put('/users/me/privacy', { [field]: nextValue });
      onPrivacyChange?.(field, nextValue);
    } catch (err) {
      setPrivacy(current => ({ ...current, [field]: previous }));
      setError(
        err.response?.data?.error?.message
        || err.response?.data?.message
        || 'Не удалось сохранить настройку'
      );
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="profile-settings">
      <button
        type="button"
        className="profile-edit"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
      >
        {open ? 'Закрыть' : 'Настройки'}
      </button>

      {open && (
        <div className="profile-settings-panel">
          <p className="profile-settings-title">Приватность</p>

          {loading && <p className="profile-settings-hint">Загружаем…</p>}
          {error && <p className="profile-settings-error" role="alert">{error}</p>}

          {privacy && ROWS.map(row => {
            const checked = Boolean(privacy[row.field]);
            const busy = saving === row.field;

            return (
              <div className="profile-settings-row" key={row.field}>
                <div className="profile-settings-copy">
                  <span className="profile-settings-label">{row.label}</span>
                  <span className="profile-settings-hint">{row.hint}</span>
                </div>
                <button
                  type="button"
                  className={`profile-switch${checked ? ' is-on' : ''}`}
                  role="switch"
                  aria-checked={checked}
                  aria-label={row.label}
                  disabled={Boolean(saving)}
                  onClick={() => toggle(row.field)}
                >
                  <span className="profile-switch-knob" aria-hidden="true" />
                </button>
                {busy && <span className="profile-settings-saving">Сохраняем…</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ProfileSettings;
