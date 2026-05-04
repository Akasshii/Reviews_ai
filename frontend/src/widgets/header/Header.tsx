import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/ui';
import { LogOutIcon, UserIcon } from '../../shared/ui';
import { authApi } from '../../shared/api/authApi';
import './Header.css';

const BACKEND_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/api$/, '');

interface HeaderProps {
  onLogout: () => void;
}

export const Header = ({ onLogout }: HeaderProps) => {
  const [user, setUser] = useState(authApi.getCurrentUser());
  const navigate = useNavigate();

  useEffect(() => {
    const refresh = () => setUser(authApi.getCurrentUser());
    window.addEventListener('userUpdated', refresh);
    return () => window.removeEventListener('userUpdated', refresh);
  }, []);

  const avatarUrl = user?.avatar ? BACKEND_ORIGIN + user.avatar : null;

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-user" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
          <div className="header-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="header-avatar-img" />
            ) : (
              <UserIcon size={20} />
            )}
          </div>
          <div className="header-user-info">
            <span className="header-user-name">{user?.name || 'Пользователь'}</span>
            <span className="header-user-email">{user?.email || ''}</span>
          </div>
        </div>

        <Button variant="ghost" size="sm" icon={<LogOutIcon size={18} />} onClick={onLogout}>
          Выйти
        </Button>
      </div>
    </header>
  );
};
