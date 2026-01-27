import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
}

export function StatsCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
}: StatsCardProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{title}</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
          <Icon className="h-4 w-4 text-indigo-400" />
        </div>
      </div>
      <div className="mt-2">
        <span className="text-2xl font-semibold text-white">{value}</span>
        {change && (
          <span
            className={cn(
              "ml-2 text-sm",
              changeType === "positive" && "text-green-400",
              changeType === "negative" && "text-red-400",
              changeType === "neutral" && "text-slate-400"
            )}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
