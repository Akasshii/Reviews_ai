import { HTMLAttributes, ReactNode } from 'react';
import './Card.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export const Card = ({
  children,
  padding = 'md',
  hoverable = false,
  className = '',
  ...props
}: CardProps) => {
  const classes = [
    'card',
    `card--padding-${padding}`,
    hoverable && 'card--hoverable',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`card__header ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h3 className={`card__title ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardContent = ({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`card__content ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`card__footer ${className}`} {...props}>
      {children}
    </div>
  );
};
