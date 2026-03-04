"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addDays, addWeeks, addMonths, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { InteractionType } from "@/types";

const INTERACTION_TYPES: { value: InteractionType; label: string; emoji: string }[] = [
  { value: "call",   label: "Call",   emoji: "📞" },
  { value: "text",   label: "Text",   emoji: "💬" },
  { value: "dm",     label: "DM",     emoji: "📩" },
  { value: "coffee", label: "Coffee", emoji: "☕" },
  { value: "dinner", label: "Dinner", emoji: "🍽️" },
  { value: "event",  label: "Event",  emoji: "🎉" },
  { value: "email",  label: "Email",  emoji: "✉️" },
  { value: "other",  label: "Other",  emoji: "👋" },
];

const FOLLOW_UP_PRESETS = [
  { label: "3 days",  getValue: () => addDays(new Date(), 3) },
  { label: "1 week",  getValue: () => addWeeks(new Date(), 1) },
  { label: "2 weeks", getValue: () => addWeeks(new Date(), 2) },
  { label: "1 month", getValue: () => addMonths(new Date(), 1) },
];

interface LogInteractionDialogProps {
  contactId: string;
}

export function LogInteractionDialog({ contactId }: LogInteractionDialogProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [type, setType] = useState<InteractionType>("other");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [followUpPreset, setFollowUpPreset] = useState<string | null>(null);
  const [followUpCustom, setFollowUpCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function getFollowUpDate(): string | null {
    if (!followUpPreset) return null;
    if (followUpPreset === "custom") {
      return followUpCustom || null;
    }
    const preset = FOLLOW_UP_PRESETS.find((p) => p.label === followUpPreset);
    return preset ? format(preset.getValue(), "yyyy-MM-dd") : null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setLoading(true);

    const supabase = createClient();
    const fullDate = new Date(date + "T12:00:00").toISOString();
    const followUpDate = getFollowUpDate();

    const { error } = await supabase.from("interactions").insert({
      contact_id: contactId,
      note: note.trim(),
      date: fullDate,
      type,
    });

    if (error) {
      toast.error("Failed to save interaction");
      setLoading(false);
      return;
    }

    const updatePayload: Record<string, string | null> = {
      last_touched_at: fullDate,
      last_touched_note: note.trim(),
    };
    if (followUpDate !== undefined) {
      updatePayload.follow_up_at = followUpDate;
    }

    await supabase.from("contacts").update(updatePayload).eq("id", contactId);

    toast.success(followUpDate ? `Logged · Follow-up set for ${format(new Date(followUpDate + "T12:00:00"), "MMM d")}` : "Interaction logged");
    setNote("");
    setType("other");
    setDate(new Date().toISOString().split("T")[0]);
    setFollowUpPreset(null);
    setFollowUpCustom("");
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95">
          <Plus className="h-6 w-6" />
        </button>
      </DialogTrigger>
      <DialogContent className="mx-4 max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log interaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type picker */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-4 gap-2">
              {INTERACTION_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border py-2 text-xs transition-colors",
                    type === t.value
                      ? "border-foreground bg-foreground/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-foreground/50"
                  )}
                >
                  <span className="text-base">{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">What happened?</Label>
            <Textarea
              id="note"
              placeholder="Had coffee, discussed their new project..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Follow-up */}
          <div className="space-y-2">
            <Label>Follow up in...</Label>
            <div className="flex flex-wrap gap-2">
              {FOLLOW_UP_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setFollowUpPreset(followUpPreset === p.label ? null : p.label)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    followUpPreset === p.label
                      ? "border-yellow-500/50 bg-yellow-500/20 text-yellow-400"
                      : "border-border text-muted-foreground hover:border-foreground/30"
                  )}
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFollowUpPreset(followUpPreset === "custom" ? null : "custom")}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  followUpPreset === "custom"
                    ? "border-yellow-500/50 bg-yellow-500/20 text-yellow-400"
                    : "border-border text-muted-foreground hover:border-foreground/30"
                )}
              >
                Custom
              </button>
            </div>
            {followUpPreset === "custom" && (
              <Input
                type="date"
                value={followUpCustom}
                onChange={(e) => setFollowUpCustom(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading || !note.trim()}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const INTERACTION_TYPE_MAP = Object.fromEntries(
  INTERACTION_TYPES.map((t) => [t.value, t])
) as Record<InteractionType, { value: InteractionType; label: string; emoji: string }>;
