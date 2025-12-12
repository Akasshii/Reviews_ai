import { Button } from '../../shared/ui';
import { LogOutIcon, UserIcon } from '../../shared/ui';
import { mockUser } from '../../shared/lib/mockData';
import './Header.css';

interface HeaderProps {
  onLogout: () => void;
}

export const Header = ({ onLogout }: HeaderProps) => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="header-user">
          <div className="header-avatar">
            <UserIcon size={20} />
          </div>
          <div className="header-user-info">
            <span className="header-user-name">{mockUser.name}</span>
            <span className="header-user-email">{mockUser.email}</span>
          </div>
        </div>

        <Button variant="ghost" size="sm" icon={<LogOutIcon size={18} />} onClick={onLogout}>
          Выйти
        </Button>
      </div>
    </header>
  );
};
