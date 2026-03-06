import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  // Invoice statuses - distinct colors for each
  'Paid': 'bg-success/10 text-success border-success/20',
  'Unpaid': 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
  'Amount Adjusted': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  'Hold': 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
  'Short': 'bg-destructive/10 text-destructive border-destructive/20',
  'Excess': 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800',
  'Cancelled': 'bg-destructive/10 text-destructive border-destructive/20',
  
  // Patient invoice statuses
  'Invoice Raised': 'bg-success/10 text-success border-success/20',
  'To Be Raised': 'bg-warning/10 text-warning border-warning/20',
  'No Share': 'bg-muted text-muted-foreground border-muted-foreground/20',
  
  // Hospital statuses
  'Active': 'bg-success/10 text-success border-success/20',
  'Inactive': 'bg-muted text-muted-foreground border-muted-foreground/20',
  'Expired Soon': 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
  'Expired': 'bg-destructive/10 text-destructive border-destructive/20',
};

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const style = statusStyles[status] || 'bg-muted text-muted-foreground border-muted-foreground/20';
  
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
        style,
        className
      )}
    >
      {status}
    </span>
  );
};
