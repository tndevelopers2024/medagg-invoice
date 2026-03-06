import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  count?: number;
  countLabel?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'accent';
  onClick?: () => void;
}

const variantStyles = {
  default: 'border-border',
  success: 'border-success/30 bg-success/5',
  warning: 'border-warning/30 bg-warning/5',
  destructive: 'border-destructive/30 bg-destructive/5',
  accent: 'border-accent/30 bg-accent/5',
};

const iconStyles = {
  default: 'bg-muted text-muted-foreground',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  accent: 'bg-accent/10 text-accent',
};

export const StatCard = ({ title, value, count, countLabel, icon: Icon, trend, variant = 'default', onClick }: StatCardProps) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'card-stat animate-fade-in',
        variantStyles[variant],
        onClick && 'cursor-pointer'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {count !== undefined && (
            <p className="text-xs text-muted-foreground mt-1">
              {count} {countLabel || 'invoices'}
            </p>
          )}
          {trend && (
            <p className={cn('text-xs mt-1', trend.isPositive ? 'text-success' : 'text-destructive')}>
              {trend.isPositive ? '+' : ''}{trend.value}% from last month
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-lg', iconStyles[variant])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
