import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DateFiltersProps {
  month: number | null;
  year: number | null;
  onMonthChange: (month: number | null) => void;
  onYearChange: (year: number | null) => void;
}

const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const years = [2024, 2025, 2026, 2027];

export const DateFilters = ({ month, year, onMonthChange, onYearChange }: DateFiltersProps) => {
  const handleYearChange = (value: string) => {
    if (value === 'all') {
      onYearChange(null);
      onMonthChange(null);
    } else {
      onYearChange(parseInt(value));
    }
  };

  const handleMonthChange = (value: string) => {
    if (value === 'all') {
      onMonthChange(null);
    } else {
      onMonthChange(parseInt(value));
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Select value={year?.toString() || 'all'} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="Select Year" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Years</SelectItem>
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select 
        value={month?.toString() || 'all'} 
        onValueChange={handleMonthChange}
        disabled={!year}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={year ? "Select month" : "Select year first"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Months</SelectItem>
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value.toString()}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
