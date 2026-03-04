import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WarmthBadge } from "@/components/warmth-badge";
import { formatCategory, timeAgo } from "@/lib/utils";
import type { Contact } from "@/types";

interface ContactCardProps {
  contact: Contact;
}

export function ContactCard({ contact }: ContactCardProps) {
  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link href={`/contacts/${contact.id}`}>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/30 active:bg-accent/50">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={contact.photo_url ?? undefined} alt={contact.name} />
          <AvatarFallback className="text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold">{contact.name}</p>
            <WarmthBadge
              lastTouchedAt={contact.last_touched_at}
              createdAt={contact.created_at}
            />
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            {contact.category && (
              <span className="text-xs text-muted-foreground">
                {formatCategory(contact.category)}
              </span>
            )}
            {contact.category && (
              <span className="text-xs text-muted-foreground">·</span>
            )}
            <span className="text-xs text-muted-foreground">
              {contact.last_touched_at
                ? `Touched ${timeAgo(contact.last_touched_at)}`
                : "Never touched"}
            </span>
          </div>
          {contact.last_touched_note && (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {contact.last_touched_note}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
