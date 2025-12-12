import { useState, FormEvent } from 'react';
import { Button, Input, Card } from '../../shared/ui';
import { MailIcon, LockIcon } from '../../shared/ui';
import './LoginPage.css';

interface LoginPageProps {
  onLogin: () => void;
}

export const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 1000);
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
