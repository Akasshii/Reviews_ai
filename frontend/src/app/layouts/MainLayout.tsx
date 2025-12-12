import { Outlet } from 'react-router-dom';
import { Sidebar } from '../../widgets/sidebar';
import { Header } from '../../widgets/header';
import './MainLayout.css';

interface MainLayoutProps {
  onLogout: () => void;
}

export const MainLayout = ({ onLogout }: MainLayoutProps) => {
  return (
    <div className="main-layout">
      <Sidebar />
      <div className="main-layout-content">
        <Header onLogout={onLogout} />
        <main className="main-layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
