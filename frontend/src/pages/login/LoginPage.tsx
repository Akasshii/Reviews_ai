import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Input, Card } from '../../shared/ui';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon } from '../../shared/ui';
import { authApi } from '../../shared/api/authApi';
import './LoginPage.css';

interface LoginPageProps {
  onLogin: () => void;
  onNavigateRegister: () => void;
  onNavigateForgotPassword: () => void;
}

export const LoginPage = ({ onLogin, onNavigateRegister, onNavigateForgotPassword }: LoginPageProps) => {
  const [email, setEmail] = useState('demo@reviews.ai');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.login({ email, password });

      // Сохраняем токен в localStorage
      localStorage.setItem('token', response.token);

      // Вызываем callback для обновления состояния
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <Card padding="lg" className="login-card">
          <div className="login-header">
            <h1 className="login-title">Reviews AI</h1>
            <p className="login-subtitle">
              Автоматический анализ отзывов с Яндекс.Карт и 2ГИС
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div style={{ padding: '12px', backgroundColor: '#fee', color: '#c00', borderRadius: '6px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <Input
              type="email"
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<MailIcon size={20} />}
              fullWidth
              required
            />

            <Input
              type={showPassword ? 'text' : 'password'}
              label="Пароль"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<LockIcon size={20} />}
              suffix={
                <span onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </span>
              }
              fullWidth
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
            >
              Войти
            </Button>
          </form>

          <div className="login-footer">
            <button className="login-link" onClick={onNavigateForgotPassword}>
              Забыли пароль?
            </button>
            <span className="login-divider">•</span>
            <button className="login-link" onClick={onNavigateRegister}>
              Создать аккаунт
            </button>
          </div>
        </Card>

        <p className="login-demo-hint">
          Demo: используйте любой email и пароль для входа
        </p>
      </div>
    </div>
  );
};
