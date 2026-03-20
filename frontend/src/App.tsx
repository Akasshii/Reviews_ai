import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { LoginPage } from './pages/login';
import { RegisterPage } from './pages/register';
import { ForgotPasswordPage } from './pages/forgot-password';
import { createAppRouter } from './app/providers/router';
import './app/styles/global.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot-password'>('login');

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAuthView('login');
  };

  if (!isAuthenticated) {
    if (authView === 'register') {
      return (
        <RegisterPage
          onRegister={handleLogin}
          onNavigateLogin={() => setAuthView('login')}
        />
      );
    }

    if (authView === 'forgot-password') {
      return (
        <ForgotPasswordPage
          onNavigateLogin={() => setAuthView('login')}
        />
      );
    }

    return (
      <LoginPage
        onLogin={handleLogin}
        onNavigateRegister={() => setAuthView('register')}
        onNavigateForgotPassword={() => setAuthView('forgot-password')}
      />
    );
  }

  const router = createAppRouter(handleLogout);

  return <RouterProvider router={router} />;
}

export default App;
