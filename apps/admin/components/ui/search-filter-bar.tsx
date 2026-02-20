"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export type FilterOption = {
  value: string;
  label: string;
};

interface SearchFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  onSearchSubmit?: () => void;
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: FilterOption[];
  filterPlaceholder?: string;
  filter2Value?: string;
  onFilter2Change?: (value: string) => void;
  filter2Options?: FilterOption[];
  filter2Placeholder?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
}

export function SearchFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  onSearchSubmit,
  filterValue,
  onFilterChange,
  filterOptions,
  filterPlaceholder = "Filter",
  filter2Value,
  onFilter2Change,
  filter2Options,
  filter2Placeholder = "Filter",
  onRefresh,
  refreshing = false,
  className = "",
}: SearchFilterBarProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchSubmit?.();
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <form onSubmit={handleSubmit} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="border-slate-700 bg-slate-800 pl-10 text-white placeholder:text-slate-500"
        />
      </form>

      {filterOptions && onFilterChange && (
        <Select value={filterValue} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[180px] border-slate-700 bg-slate-800 text-white">
            <SelectValue placeholder={filterPlaceholder} />
          </SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-800">
            {filterOptions.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-white hover:bg-slate-700 focus:bg-slate-700"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {filter2Options && onFilter2Change && (
        <Select value={filter2Value} onValueChange={onFilter2Change}>
          <SelectTrigger className="w-[180px] border-slate-700 bg-slate-800 text-white">
            <SelectValue placeholder={filter2Placeholder} />
          </SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-800">
            {filter2Options.map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-white hover:bg-slate-700 focus:bg-slate-700"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {onRefresh && (
        <Button
          variant="outline"
          size="icon"
          onClick={() => {
            onRefresh();
            toast.success("Data refreshed");
          }}
          disabled={refreshing}
          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      )}
    </div>
  );
}
