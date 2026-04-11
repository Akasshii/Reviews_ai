import type { ReactNode } from 'react';
import { Card } from '../../shared/ui';
import './StatsCard.css';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'info';
}

export const StatsCard = ({ title, value, icon, trend, color = 'primary' }: StatsCardProps) => {
  return (
    <Card hoverable className="stats-card">
      <div className="stats-card__content">
        <div className="stats-card__info">
          <p className="stats-card__title">{title}</p>
          <h3 className="stats-card__value">{value}</h3>
          {trend && (
            <div className={`stats-card__trend ${trend.isPositive ? 'stats-card__trend--positive' : 'stats-card__trend--negative'}`}>
              <span className="stats-card__trend-arrow">
                {trend.isPositive ? '↑' : '↓'}
              </span>
              <span className="stats-card__trend-value">{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={`stats-card__icon stats-card__icon--${color}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};
