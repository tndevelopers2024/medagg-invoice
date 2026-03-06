import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface TruncatedCellProps {
  value: string | number | null | undefined;
  maxWidth?: string;
  className?: string;
}

export const TruncatedCell = ({ value, maxWidth = '150px', className = '' }: TruncatedCellProps) => {
  const displayValue = value === null || value === undefined || value === '' ? '-' : String(value);
  
  if (displayValue === '-') {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span 
          className={`block truncate whitespace-nowrap ${className}`}
          style={{ maxWidth }}
        >
          {displayValue}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[300px] break-words">
        {displayValue}
      </TooltipContent>
    </Tooltip>
  );
};
