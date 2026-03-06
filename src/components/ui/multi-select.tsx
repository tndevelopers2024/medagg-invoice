import * as React from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  maxDisplay?: number;
}

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
  disabled = false,
  maxDisplay = 1,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedOptions = options.filter((option) => value.includes(option.value));

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options;
    const query = searchQuery.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        (option.sublabel && option.sublabel.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);

  const handleSelect = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onValueChange(value.filter((v) => v !== optionValue));
    } else {
      onValueChange([...value, optionValue]);
    }
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(value.filter((v) => v !== optionValue));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange([]);
  };

  const selectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(filteredOptions.map(o => o.value));
  };

  const allSelected = filteredOptions.length > 0 && filteredOptions.every(o => value.includes(o.value));

  // Display text based on selection count
  const getDisplayText = () => {
    if (selectedOptions.length === 0) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }
    if (selectedOptions.length === 1) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="truncate max-w-[180px] inline-block">{selectedOptions[0].label}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[300px]">
            <p>{selectedOptions[0].label}</p>
            {selectedOptions[0].sublabel && <p className="text-xs text-muted-foreground">{selectedOptions[0].sublabel}</p>}
          </TooltipContent>
        </Tooltip>
      );
    }
    return (
      <Badge variant="secondary" className="font-normal">
        {selectedOptions.length} selected
        <button
          className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          onMouseDown={(e) => e.preventDefault()}
          onClick={clearAll}
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal h-10", className)}
          disabled={disabled}
        >
          <div className="flex-1 text-left truncate">
            {getDisplayText()}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] min-w-[280px] p-0 z-50 bg-popover" 
        align="start"
      >
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {/* Select All / Clear All buttons */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
            <button
              onClick={selectAll}
              className="text-xs text-primary hover:underline disabled:opacity-50"
              disabled={allSelected}
            >
              Select All ({filteredOptions.length})
            </button>
            <button
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              disabled={value.length === 0}
            >
              Clear All
            </button>
          </div>
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className="cursor-pointer py-2"
                >
                  <Checkbox
                    checked={value.includes(option.value)}
                    className="mr-2 shrink-0"
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="break-words">{option.label}</span>
                        {option.sublabel && (
                          <span className="text-xs text-muted-foreground break-words">{option.sublabel}</span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[300px]">
                      <p>{option.label}</p>
                      {option.sublabel && <p className="text-xs text-muted-foreground">{option.sublabel}</p>}
                    </TooltipContent>
                  </Tooltip>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}