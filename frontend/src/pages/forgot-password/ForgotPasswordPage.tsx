import { Button, Card } from '../../shared/ui';
import { LockIcon } from '../../shared/ui';
import './ForgotPasswordPage.css';

interface ForgotPasswordPageProps {
  onNavigateLogin: () => void;
}

export const ForgotPasswordPage = ({ onNavigateLogin }: ForgotPasswordPageProps) => {
  return (
    <div className="login-page">
      <div className="login-container">
        <Card padding="lg" className="login-card">
          <div className="forgot-password-content">
            <h1 className="login-title">Восстановление пароля</h1>

            <div className="forgot-password-icon">
              <LockIcon size={48} />
            </div>

            <p className="forgot-password-text">
              Для сброса пароля обратитесь к администратору системы
            </p>

            <p className="forgot-password-hint">
              Или используйте функцию смены пароля в настройках профиля
            </p>

            <Button variant="primary" fullWidth onClick={onNavigateLogin}>
              Назад к входу
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
