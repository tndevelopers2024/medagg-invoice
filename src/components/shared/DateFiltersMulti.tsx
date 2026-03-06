import { MultiSelect } from '@/components/ui/multi-select';
import { Label } from '@/components/ui/label';

interface DateFiltersMultiProps {
  months: string[];
  years: string[];
  onMonthChange: (months: string[]) => void;
  onYearChange: (years: string[]) => void;
  monthLabel?: string;
  yearLabel?: string;
  disabled?: boolean;
}

const monthOptions = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

// Generate years from 2020 to current year + 15 (for future years)
const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const startYear = 2020;
  const endYear = currentYear + 15;
  const years = [];
  for (let year = startYear; year <= endYear; year++) {
    years.push({ value: year.toString(), label: year.toString() });
  }
  return years;
};

const yearOptions = generateYearOptions();

export const DateFiltersMulti = ({ 
  months, 
  years, 
  onMonthChange, 
  onYearChange,
  monthLabel = 'Month',
  yearLabel = 'Year',
  disabled = false,
}: DateFiltersMultiProps) => {
  return (
    <div className="flex items-end gap-3">
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">{yearLabel}</Label>
        <MultiSelect
          options={yearOptions}
          value={years}
          onValueChange={onYearChange}
          placeholder="All Years"
          searchPlaceholder="Search year..."
          className="w-[130px]"
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">{monthLabel}</Label>
        <MultiSelect
          options={monthOptions}
          value={months}
          onValueChange={onMonthChange}
          placeholder="All Months"
          searchPlaceholder="Search month..."
          className="w-[150px]"
          disabled={disabled || years.length === 0}
        />
      </div>
    </div>
  );
};
