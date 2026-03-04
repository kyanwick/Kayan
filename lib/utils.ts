import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInDays } from "date-fns";
import type { Warmth } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// createdAt is used as a fallback when lastTouchedAt is null
// so a newly added contact starts hot, not cold
export function getWarmth(
  lastTouchedAt: string | null,
  createdAt?: string | null
): Warmth {
  const ref = lastTouchedAt ?? createdAt ?? null;
  if (!ref) return "cold";
  const days = differenceInDays(new Date(), new Date(ref));
  if (days < 14) return "hot";
  if (days < 30) return "warm";
  return "cold";
}

export function warmthLabel(warmth: Warmth): string {
  switch (warmth) {
    case "hot":
      return "Hot";
    case "warm":
      return "Warm";
    case "cold":
      return "Cold";
  }
}

export function warmthColor(warmth: Warmth): string {
  switch (warmth) {
    case "hot":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "warm":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "cold":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  }
}

export function formatCategory(category: string | null): string {
  if (!category) return "";
  return category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const days = differenceInDays(new Date(), new Date(dateStr));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function socialUrl(platform: string, handle: string): string {
  const h = handle.replace(/^@/, "");
  switch (platform) {
    case "instagram":
      return `https://instagram.com/${h}`;
    case "twitter":
      return `https://x.com/${h}`;
    case "linkedin":
      return `https://linkedin.com/in/${h}`;
    case "tiktok":
      return `https://tiktok.com/@${h}`;
    default:
      return "#";
  }
}

// Deep-link to DM on mobile if possible, fall back to profile
export function dmUrl(platform: string, handle: string): string {
  const h = handle.replace(/^@/, "");
  switch (platform) {
    case "instagram":
      // instagram://user?username=h opens IG app on mobile
      return `https://ig.me/m/${h}`;
    case "twitter":
      return `https://x.com/${h}`;
    case "linkedin":
      return `https://linkedin.com/in/${h}`;
    case "tiktok":
      return `https://tiktok.com/@${h}`;
    default:
      return "#";
  }
}
