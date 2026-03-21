import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { DashboardPage } from '../../pages/dashboard';
import { ReportsPage } from '../../pages/reports';
import { ReportDetailPage } from '../../pages/report-detail';
import { ProfilePage } from '../../pages/profile';
import { SettingsPage } from '../../pages/settings';
import { LocationsPage } from '../../pages/locations';

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
          path: 'reports/:id',
          element: <ReportDetailPage />,
        },
        {
          path: 'locations',
          element: <LocationsPage />,
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
