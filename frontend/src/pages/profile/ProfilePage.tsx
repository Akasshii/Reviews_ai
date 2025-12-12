import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../../shared/ui';
import { UserIcon, MailIcon } from '../../shared/ui';
import { mockUser } from '../../shared/lib/mockData';
import './ProfilePage.css';

export const ProfilePage = () => {
  const [name, setName] = useState(mockUser.name);
  const [email, setEmail] = useState(mockUser.email);
  const [company, setCompany] = useState(mockUser.company || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(mockUser.name);
    setEmail(mockUser.email);
    setCompany(mockUser.company || '');
    setIsEditing(false);
  };

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1 className="profile-title">Профиль</h1>
        <p className="profile-subtitle">Управление информацией вашего аккаунта</p>
      </div>

      <div className="profile-content">
        <Card padding="lg" className="profile-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              <UserIcon size={48} />
            </div>
            <div className="profile-avatar-info">
              <h2 className="profile-name">{mockUser.name}</h2>
              <p className="profile-email">{mockUser.email}</p>
            </div>
            <Button variant="outline" size="sm">
              Изменить фото
            </Button>
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader>
            <div className="card-header-with-action">
              <CardTitle>Личная информация</CardTitle>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Редактировать
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="profile-form">
              <Input
                label="Имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
                fullWidth
              />
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<MailIcon size={20} />}
                disabled={!isEditing}
                fullWidth
              />
              <Input
                label="Компания"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={!isEditing}
                fullWidth
              />

              {isEditing && (
                <div className="profile-form-actions">
                  <Button variant="outline" onClick={handleCancel} fullWidth>
                    Отмена
                  </Button>
                  <Button variant="primary" onClick={handleSave} fullWidth>
                    Сохранить
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card padding="lg">
          <CardHeader>
            <CardTitle>Статистика аккаунта</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="profile-stats">
              <div className="profile-stat">
                <span className="profile-stat-value">425</span>
                <span className="profile-stat-label">Всего отзывов</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-value">3</span>
                <span className="profile-stat-label">Отчетов создано</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-value">2</span>
                <span className="profile-stat-label">Подключено платформ</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
