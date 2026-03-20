import { useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Input, Card } from '../../shared/ui';
import { UserIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from '../../shared/ui';
import { authApi } from '../../shared/api/authApi';
import './RegisterPage.css';

interface RegisterPageProps {
  onRegister: () => void;
  onNavigateLogin: () => void;
}

export const RegisterPage = ({ onRegister, onNavigateLogin }: RegisterPageProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password || !confirmPassword) {
      setError('Все поля обязательны для заполнения');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      await authApi.register({ email, password, name });
      await authApi.login({ email, password });
      onRegister();
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
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
            <p className="login-subtitle">Создание аккаунта</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div style={{ padding: '12px', backgroundColor: '#fee', color: '#c00', borderRadius: '6px', marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <Input
              label="Имя"
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={<UserIcon size={20} />}
              fullWidth
              required
            />

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
              placeholder="Минимум 6 символов"
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

            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              label="Подтверждение пароля"
              placeholder="Повторите пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<LockIcon size={20} />}
              suffix={
                <span onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
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
              Создать аккаунт
            </Button>
          </form>

          <div className="login-footer">
            <span className="login-subtitle-text">Уже есть аккаунт?</span>
            <button className="login-link" onClick={onNavigateLogin}>
              Войти
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};
