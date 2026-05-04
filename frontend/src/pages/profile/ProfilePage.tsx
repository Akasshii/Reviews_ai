import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '../../shared/ui';
import { UserIcon, MailIcon } from '../../shared/ui';
import { authApi } from '../../shared/api/authApi';
import { userApi } from '../../shared/api/userApi';
import { reportApi } from '../../shared/api/reportApi';
import './ProfilePage.css';

const BACKEND_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');

export const ProfilePage = () => {
  const currentUser = authApi.getCurrentUser();

  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const [displayName, setDisplayName] = useState(currentUser?.name || '');
  const [displayEmail, setDisplayEmail] = useState(currentUser?.email || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser?.avatar ? BACKEND_ORIGIN + currentUser.avatar : null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSuccessMsg] = useState(false);
  const [stats, setStats] = useState({ totalReviews: 0, totalReports: 0, platforms: 0 });

  useEffect(() => {
    userApi.getProfile().then((profile) => {
      setName(profile.name);
      setEmail(profile.email);
      setCompany(profile.company || '');
      setPosition(profile.position || '');
      setDisplayName(profile.name);
      setDisplayEmail(profile.email);
      if (profile.avatar) setAvatarUrl(BACKEND_ORIGIN + profile.avatar);
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

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Файл превышает 5 МБ');
      return;
    }

    try {
      setAvatarUploading(true);
      setAvatarError(null);
      const updated = await userApi.uploadAvatar(file);
      if (updated.avatar) {
        const fullUrl = BACKEND_ORIGIN + updated.avatar;
        setAvatarUrl(fullUrl);
        authApi.updateCurrentUser({ avatar: updated.avatar });
        window.dispatchEvent(new CustomEvent('userUpdated'));
      }
    } catch (err: any) {
      setAvatarError(err.message || 'Ошибка загрузки фото');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setSaveError('Имя не может быть пустым');
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      await userApi.updateProfile({
        name: name.trim(),
        company: company.trim() || undefined,
        position: position.trim() || undefined,
      });

      authApi.updateCurrentUser({ name: name.trim() });

      setDisplayName(name.trim());
      setDisplayEmail(email);
      setIsEditing(false);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
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
            <div
              className="profile-avatar profile-avatar--clickable"
              onClick={() => fileInputRef.current?.click()}
              title="Нажмите для смены фото"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="profile-avatar-img" />
              ) : (
                <UserIcon size={48} />
              )}
              <div className="profile-avatar-overlay">
                {avatarUploading ? '...' : '✎'}
              </div>
            </div>
            <div className="profile-avatar-info">
              <h2 className="profile-name">{displayName}</h2>
              <p className="profile-email">{displayEmail}</p>
            </div>
            <div className="profile-avatar-actions">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                loading={avatarUploading}
              >
                Изменить фото
              </Button>
              {avatarError && (
                <p className="profile-avatar-error">{avatarError}</p>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              style={{ display: 'none' }}
              onChange={handleAvatarFileChange}
            />
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
                icon={<MailIcon size={20} />}
                disabled={true}
                fullWidth
              />
              <Input
                label="Компания"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={!isEditing}
                fullWidth
              />
              <Input
                label="Должность"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                disabled={!isEditing}
                fullWidth
              />

              {saveError && (
                <div style={{ padding: '10px 12px', backgroundColor: '#fee', color: '#c00', borderRadius: '6px', fontSize: '0.875rem' }}>
                  {saveError}
                </div>
              )}
              {saveSuccess && (
                <div style={{ padding: '10px 12px', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '6px', fontSize: '0.875rem' }}>
                  Профиль успешно сохранён
                </div>
              )}

              {isEditing && (
                <div className="profile-form-actions">
                  <Button variant="outline" onClick={handleCancel} fullWidth>
                    Отмена
                  </Button>
                  <Button variant="primary" onClick={handleSave} fullWidth loading={saving}>
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
