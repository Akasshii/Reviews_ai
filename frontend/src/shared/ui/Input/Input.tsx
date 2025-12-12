import { InputHTMLAttributes, ReactNode, forwardRef } from 'react';
import './Input.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, fullWidth = false, className = '', ...props }, ref) => {
    const wrapperClasses = [
      'input-wrapper',
      fullWidth && 'input-wrapper--full-width',
    ]
      .filter(Boolean)
      .join(' ');

    const inputClasses = [
      'input',
      error && 'input--error',
      icon && 'input--with-icon',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        {label && <label className="input-label">{label}</label>}
        <div className="input-container">
          {icon && <span className="input-icon">{icon}</span>}
          <input ref={ref} className={inputClasses} {...props} />
        </div>
        {error && <span className="input-error">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
