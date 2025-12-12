import { useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { LoginPage } from './pages/login';
import { createAppRouter } from './app/providers/router';
import './app/styles/global.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const router = createAppRouter(handleLogout);

  return <RouterProvider router={router} />;
}

export default App;
