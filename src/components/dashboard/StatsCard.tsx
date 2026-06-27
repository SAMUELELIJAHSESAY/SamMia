import { Card, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color?: 'primary' | 'success' | 'danger' | 'warning' | 'secondary' | 'accent';
}

export function StatsCard({ title, value, subtitle, icon, trend, color = 'primary' }: StatsCardProps) {
  const colorClasses = {
    primary: {
      bg: 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30',
      icon: 'bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-800 dark:to-primary-700 text-primary-600 dark:text-primary-300',
      text: 'text-primary-600 dark:text-primary-400',
    },
    success: {
      bg: 'bg-gradient-to-br from-success-50 to-success-100 dark:from-success-900/30 dark:to-success-800/30',
      icon: 'bg-gradient-to-br from-success-100 to-success-200 dark:from-success-800 dark:to-success-700 text-success-600 dark:text-success-300',
      text: 'text-success-600 dark:text-success-400',
    },
    danger: {
      bg: 'bg-gradient-to-br from-danger-50 to-danger-100 dark:from-danger-900/30 dark:to-danger-800/30',
      icon: 'bg-gradient-to-br from-danger-100 to-danger-200 dark:from-danger-800 dark:to-danger-700 text-danger-600 dark:text-danger-300',
      text: 'text-danger-600 dark:text-danger-400',
    },
    warning: {
      bg: 'bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-900/30 dark:to-warning-800/30',
      icon: 'bg-gradient-to-br from-warning-100 to-warning-200 dark:from-warning-800 dark:to-warning-700 text-warning-600 dark:text-warning-300',
      text: 'text-warning-600 dark:text-warning-400',
    },
    secondary: {
      bg: 'bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-900/30 dark:to-secondary-800/30',
      icon: 'bg-gradient-to-br from-secondary-100 to-secondary-200 dark:from-secondary-800 dark:to-secondary-700 text-secondary-600 dark:text-secondary-300',
      text: 'text-secondary-600 dark:text-secondary-400',
    },
    accent: {
      bg: 'bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/30 dark:to-accent-800/30',
      icon: 'bg-gradient-to-br from-accent-100 to-accent-200 dark:from-accent-800 dark:to-accent-700 text-accent-600 dark:text-accent-300',
      text: 'text-accent-600 dark:text-accent-400',
    },
  };

  const classes = colorClasses[color];

  return (
    <Card className={cn('overflow-hidden transition-all hover:shadow-lg', classes.bg)}>
      <CardContent className="p-5 lg:p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">{title}</p>
            <p className="text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 mt-3">
                {trend.isPositive ? (
                  <TrendingUp className="w-4 h-4 text-success-600 dark:text-success-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-danger-600 dark:text-danger-400" />
                )}
                <span className={cn(
                  'text-sm font-semibold',
                  trend.isPositive ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'
                )}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs last period</span>
              </div>
            )}
          </div>
          <div className={cn('p-3 lg:p-4 rounded-2xl flex-shrink-0', classes.icon)}>
            <div className="w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center">
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
