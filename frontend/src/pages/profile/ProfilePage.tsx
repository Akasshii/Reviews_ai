import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../../shared/ui';
import { UserIcon, MailIcon } from '../../shared/ui';
import { authApi } from '../../shared/api/authApi';
import { userApi } from '../../shared/api/userApi';
import { reportApi } from '../../shared/api/reportApi';
import './ProfilePage.css';

export const ProfilePage = () => {
  const currentUser = authApi.getCurrentUser();

  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [company, setCompany] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const [displayEmail, setDisplayEmail] = useState(currentUser?.email || '');
  const [stats, setStats] = useState({ totalReviews: 0, totalReports: 0, platforms: 0 });

  useEffect(() => {
    userApi.getProfile().then((profile) => {
      setName(profile.name);
      setEmail(profile.email);
      setCompany(profile.company || '');
      setDisplayName(profile.name);
      setDisplayEmail(profile.email);
    }).catch(() => {
      // fallback to localStorage data already set
    });

    reportApi.getReports().then((reports) => {
      const totalReviews = reports.reduce((sum, r) => sum + (r.totalReviews || r.stats?.totalReviews || 0), 0);
      const platformsSet = new Set<string>();
      reports.forEach(r => { if (r.platform && r.platform !== 'all') platformsSet.add(r.platform); });
      setStats({ totalReviews, totalReports: reports.length, platforms: platformsSet.size });
    }).catch(() => {
      // keep defaults (zeros)
    });
  }, []);

  const handleSave = () => {
    setDisplayName(name);
    setDisplayEmail(email);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setName(displayName);
    setEmail(displayEmail);
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
              <h2 className="profile-name">{displayName}</h2>
              <p className="profile-email">{displayEmail}</p>
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
                <span className="profile-stat-value">{stats.totalReviews}</span>
                <span className="profile-stat-label">Всего отзывов</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-value">{stats.totalReports}</span>
                <span className="profile-stat-label">Отчетов создано</span>
              </div>
              <div className="profile-stat">
                <span className="profile-stat-value">{stats.platforms}</span>
                <span className="profile-stat-label">Подключено платформ</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
