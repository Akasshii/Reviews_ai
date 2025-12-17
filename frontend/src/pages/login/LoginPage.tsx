import { useState, FormEvent } from 'react';
import { Button, Input, Card } from '../../shared/ui';
import { MailIcon, LockIcon } from '../../shared/ui';
import { authApi } from '../../shared/api/authApi';
import './LoginPage.css';

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [email, setEmail] = useState('demo@reviews.ai');
  const [password, setPassword] = useState('password123');
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
              type="password"
              label="Пароль"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<LockIcon size={20} />}
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
            <a href="#" className="login-link">
              Забыли пароль?
            </a>
            <span className="login-divider">•</span>
            <a href="#" className="login-link">
              Создать аккаунт
            </a>
          </div>
        </Card>

        <p className="login-demo-hint">
          Demo: используйте любой email и пароль для входа
        </p>
      </div>
    </div>
  );
};
