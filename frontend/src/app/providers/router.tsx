import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { DashboardPage } from '../../pages/dashboard';
import { ReportsPage } from '../../pages/reports';
import { ProfilePage } from '../../pages/profile';
import { SettingsPage } from '../../pages/settings';

export const createAppRouter = (onLogout: () => void) =>
  createBrowserRouter([
    {
      path: '/',
      element: <MainLayout onLogout={onLogout} />,
      children: [
        {
          index: true,
          element: <DashboardPage />,
        },
        {
          path: 'reports',
          element: <ReportsPage />,
        },
        {
          path: 'profile',
          element: <ProfilePage />,
        },
        {
          path: 'settings',
          element: <SettingsPage />,
        },
        {
          path: '*',
          element: <Navigate to="/" replace />,
        },
      ],
    },
  ]);
