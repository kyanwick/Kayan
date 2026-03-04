import { cn, getWarmth, warmthColor, warmthLabel } from "@/lib/utils";

interface WarmthBadgeProps {
  lastTouchedAt: string | null;
  createdAt?: string | null;
  className?: string;
}

export function WarmthBadge({ lastTouchedAt, createdAt, className }: WarmthBadgeProps) {
  const warmth = getWarmth(lastTouchedAt, createdAt);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        warmthColor(warmth),
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {warmthLabel(warmth)}
    </span>
  );
}
