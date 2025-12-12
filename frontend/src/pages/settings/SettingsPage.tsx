import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../../shared/ui';
import { LockIcon } from '../../shared/ui';
import './SettingsPage.css';

export const SettingsPage = () => {
  const [notifications, setNotifications] = useState({
    emailReports: true,
    emailNewReviews: false,
    emailWeeklySummary: true,
  });

  const [apiKeys] = useState({
    yandex: '••••••••••••••••',
    twoGis: '••••••••••••••••',
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
                <Button variant="outline" size="sm">
                  Изменить пароль
                </Button>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h4 className="setting-title">Двухфакторная аутентификация</h4>
                  <p className="setting-description">
                    Дополнительная защита вашего аккаунта
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  Настроить
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card padding="lg">
          <CardHeader>
            <CardTitle>API ключи</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-section">
              <Input
                label="Яндекс.Карты API"
                value={apiKeys.yandex}
                icon={<LockIcon size={20} />}
                fullWidth
                disabled
              />
              <Input
                label="2ГИС API"
                value={apiKeys.twoGis}
                icon={<LockIcon size={20} />}
                fullWidth
                disabled
              />
              <Button variant="primary" size="sm">
                Обновить ключи
              </Button>
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
            <CardTitle>Опасная зона</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-section">
              <div className="setting-item">
                <div className="setting-info">
                  <h4 className="setting-title">Удалить аккаунт</h4>
                  <p className="setting-description">
                    Безвозвратное удаление аккаунта и всех данных
                  </p>
                </div>
                <Button variant="danger" size="sm">
                  Удалить аккаунт
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
