import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, EyeIcon, EyeOffIcon } from '../../shared/ui';
import { userApi } from '../../shared/api/userApi';
import './SettingsPage.css';

export const SettingsPage = () => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [notifications, setNotifications] = useState({
    emailReports: true,
    emailNewReviews: false,
    emailWeeklySummary: true,
  });

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Настройки</h1>
        <p className="settings-subtitle">Управление параметрами системы</p>
      </div>

      <div className="settings-content">
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Безопасность</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-section">
              <div className="setting-item">
                <div className="setting-info">
                  <h4 className="setting-title">Пароль</h4>
                  <p className="setting-description">
                    Изменение пароля для входа в систему
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowPasswordModal(true)}>
                  Изменить пароль
                </Button>
              </div>

            </div>
          </CardContent>
        </Card>

        <Card padding="lg">
          <CardHeader>
            <CardTitle>Уведомления</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-section">
              <div className="setting-toggle">
                <div className="setting-info">
                  <h4 className="setting-title">Email уведомления о новых отчетах</h4>
                  <p className="setting-description">
                    Получать уведомления когда отчет готов
                  </p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={notifications.emailReports}
                    onChange={(e) =>
                      setNotifications({ ...notifications, emailReports: e.target.checked })
                    }
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-toggle">
                <div className="setting-info">
                  <h4 className="setting-title">Email уведомления о новых отзывах</h4>
                  <p className="setting-description">
                    Получать уведомления о каждом новом отзыве
                  </p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={notifications.emailNewReviews}
                    onChange={(e) =>
                      setNotifications({ ...notifications, emailNewReviews: e.target.checked })
                    }
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-toggle">
                <div className="setting-info">
                  <h4 className="setting-title">Еженедельная сводка</h4>
                  <p className="setting-description">
                    Получать еженедельный отчет по email
                  </p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={notifications.emailWeeklySummary}
                    onChange={(e) =>
                      setNotifications({ ...notifications, emailWeeklySummary: e.target.checked })
                    }
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card padding="lg">
          <CardHeader>
            <CardTitle>Удалить аккаунт</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-section">
              <div className="setting-item">
                <div className="setting-info">
  
                  <h4 className="setting-title">
                    Безвозвратное удаление аккаунта и всех данных
                  </h4>
                </div>
                <Button variant="danger" size="sm">
                  Удалить аккаунт
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </div>
  );
};

const ChangePasswordModal = ({ onClose }: { onClose: () => void }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Заполните все поля');
      return;
    }
    if (newPassword.length < 6) {
      setError('Новый пароль должен содержать минимум 6 символов');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Новые пароли не совпадают');
      return;
    }

    try {
      setLoading(true);
      await userApi.changePassword({ currentPassword, newPassword });
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setError(err.message || 'Ошибка смены пароля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => !loading && onClose()}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <Card padding="lg">
          <CardHeader>
            <CardTitle>Изменить пароль</CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ color: '#10b981', fontSize: '1rem' }}>
                  Пароль успешно изменён!
                </p>
              </div>
            ) : (
              <div className="modal-form">
                {error && (
                  <div style={{ padding: '12px', backgroundColor: '#fee', color: '#c00', borderRadius: '6px', marginBottom: '16px' }}>
                    {error}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Текущий пароль</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Введите текущий пароль"
                      className="date-input"
                      style={{ width: '100%' }}
                    />
                    <span className="password-toggle" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                      {showCurrentPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Новый пароль</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Минимум 6 символов"
                      className="date-input"
                      style={{ width: '100%' }}
                    />
                    <span className="password-toggle" onClick={() => setShowNewPassword(!showNewPassword)}>
                      {showNewPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Подтверждение нового пароля</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Повторите новый пароль"
                      className="date-input"
                      style={{ width: '100%' }}
                    />
                    <span className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </span>
                  </div>
                </div>

                <div className="modal-actions">
                  <Button variant="outline" onClick={onClose} fullWidth disabled={loading}>
                    Отмена
                  </Button>
                  <Button variant="primary" onClick={handleSubmit} fullWidth loading={loading}>
                    Сохранить
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
