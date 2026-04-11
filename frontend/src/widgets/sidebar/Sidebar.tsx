import { NavLink, Link } from 'react-router-dom';
import { HomeIcon, FileTextIcon, MapPinIcon, UserIcon, SettingsIcon } from '../../shared/ui';
import './Sidebar.css';

export const Sidebar = () => {
  const navItems = [
    { to: '/', icon: HomeIcon, label: 'Главная' },
    { to: '/reports', icon: FileTextIcon, label: 'Отчеты' },
    { to: '/locations', icon: MapPinIcon, label: 'Филиалы' },
    { to: '/profile', icon: UserIcon, label: 'Профиль' },
    { to: '/settings', icon: SettingsIcon, label: 'Настройки' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link to="/" className="sidebar-logo-link">
          <h2 className="sidebar-logo">Reviews AI</h2>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
