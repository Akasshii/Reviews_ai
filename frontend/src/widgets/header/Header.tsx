import { useNavigate } from 'react-router-dom';
import { Button } from '../../shared/ui';
import { LogOutIcon, UserIcon } from '../../shared/ui';
import { authApi } from '../../shared/api/authApi';
import './Header.css';

interface HeaderProps {
  onLogout: () => void;
}

export const Header = ({ onLogout }: HeaderProps) => {
  const user = authApi.getCurrentUser();
  const navigate = useNavigate();

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-user" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
          <div className="header-avatar">
            <UserIcon size={20} />
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
