import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Pencil, Phone, Mail, Cake, MessageCircle, CalendarCheck } from "lucide-react";
import { DismissFollowUp } from "@/components/dismiss-follow-up";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WarmthBadge } from "@/components/warmth-badge";
import { LogInteractionDialog, INTERACTION_TYPE_MAP } from "@/components/log-interaction-dialog";
import { createClient } from "@/lib/supabase/server";
import { formatCategory, timeAgo, dmUrl } from "@/lib/utils";
import { format } from "date-fns";
import type { InteractionType } from "@/types";

const SOCIALS = [
  { key: "instagram", label: "Instagram", emoji: "📸", color: "text-pink-400 border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20" },
  { key: "twitter",   label: "X",         emoji: "𝕏",  color: "text-foreground border-border bg-card hover:bg-accent" },
  { key: "linkedin",  label: "LinkedIn",  emoji: "in", color: "text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20" },
  { key: "tiktok",    label: "TikTok",    emoji: "🎵", color: "text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20" },
] as const;

export default async function ContactProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    { data: contact },
    { data: tags },
    { data: offers },
    { data: needs },
    { data: interactions },
  ] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", id).single(),
    supabase.from("contact_tags").select("*").eq("contact_id", id),
    supabase.from("contact_offers").select("*").eq("contact_id", id),
    supabase.from("contact_needs").select("*").eq("contact_id", id),
    supabase
      .from("interactions")
      .select("*")
      .eq("contact_id", id)
      .order("date", { ascending: false }),
  ]);

  if (!contact) notFound();

  const initials = contact.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const birthdayDisplay = contact.birthday
    ? format(new Date(contact.birthday + "T12:00:00"), "MMMM d")
    : null;

  // Build greeting SMS body
  const greetingBody = encodeURIComponent(`Hey ${contact.name.split(" ")[0]}! 👋`);
  const smsHref = contact.phone
    ? `sms:${contact.phone}?&body=${greetingBody}`
    : null;

  // Which socials does this contact have?
  const activeSocials = SOCIALS.filter((s) => contact[s.key]);

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <Link href="/contacts" className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <Link href={`/contacts/${id}/edit`} className="text-muted-foreground hover:text-foreground">
            <Pencil className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Hero */}
        <div className="flex items-start gap-4">
          <Avatar className="h-20 w-20 shrink-0">
            <AvatarImage src={contact.photo_url ?? undefined} alt={contact.name} />
            <AvatarFallback className="text-xl font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="text-2xl font-bold leading-tight">{contact.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {contact.category && (
                <span className="text-sm text-muted-foreground">
                  {formatCategory(contact.category)}
                </span>
              )}
              <WarmthBadge
                lastTouchedAt={contact.last_touched_at}
                createdAt={contact.created_at}
              />
            </div>
            {contact.last_touched_at && (
              <p className="mt-1 text-xs text-muted-foreground">
                Last touched {timeAgo(contact.last_touched_at)}
                {contact.last_touched_note && ` · ${contact.last_touched_note}`}
              </p>
            )}
          </div>
        </div>

        {/* Follow-up banner */}
        {contact.follow_up_at && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-yellow-400 shrink-0" />
              <p className="text-sm text-yellow-400">
                Follow up due{" "}
                <span className="font-semibold">
                  {format(new Date(contact.follow_up_at + "T12:00:00"), "MMM d")}
                </span>
              </p>
            </div>
            <DismissFollowUp contactId={id} />
          </div>
        )}

        {/* ── Quick reach bar ── */}
        {(smsHref || activeSocials.length > 0 || contact.email || contact.phone) && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Reach out
            </h2>

            <div className="flex flex-wrap gap-2">
              {/* Quick greeting via SMS */}
              {smsHref && (
                <a
                  href={smsHref}
                  className="flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-medium text-green-400 transition-colors hover:bg-green-500/20 active:scale-95"
                >
                  <MessageCircle className="h-4 w-4" />
                  Quick text
                </a>
              )}

              {/* Call */}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {contact.phone}
                </a>
              )}

              {/* Email */}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent"
                >
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  {contact.email}
                </a>
              )}

              {/* Social DM / profile links */}
              {activeSocials.map((s) => (
                <a
                  key={s.key}
                  href={dmUrl(s.key, contact[s.key] as string)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${s.color}`}
                >
                  <span className="text-base leading-none">{s.emoji}</span>
                  @{(contact[s.key] as string).replace(/^@/, "")}
                </a>
              ))}

              {/* Birthday */}
              {birthdayDisplay && (
                <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm">
                  <Cake className="h-3.5 w-3.5 text-muted-foreground" />
                  {birthdayDisplay}
                </div>
              )}
            </div>
          </section>
        )}

        {/* How we met */}
        {contact.how_we_met && (
          <section>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              How we met
            </h2>
            <p className="text-sm">{contact.how_we_met}</p>
          </section>
        )}

        {/* Notes */}
        {contact.notes && (
          <section>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </h2>
            <p className="text-sm whitespace-pre-wrap">{contact.notes}</p>
          </section>
        )}

        {/* Offers */}
        {offers && offers.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              They offer
            </h2>
            <div className="flex flex-wrap gap-2">
              {offers.map((o) => (
                <Link
                  key={o.id}
                  href={`/connect?mode=offers&q=${encodeURIComponent(o.text)}`}
                  className="rounded-full border border-green-500/30 bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400 transition-colors hover:bg-green-500/30"
                >
                  {o.text}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Needs */}
        {needs && needs.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              They need
            </h2>
            <div className="flex flex-wrap gap-2">
              {needs.map((n) => (
                <Link
                  key={n.id}
                  href={`/connect?mode=needs&q=${encodeURIComponent(n.text)}`}
                  className="rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/30"
                >
                  {n.text}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t.id}
                  className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
                >
                  {t.tag}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Interaction history */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Interaction history
            {interactions && interactions.length > 0 && (
              <span className="ml-2 normal-case text-muted-foreground">({interactions.length})</span>
            )}
          </h2>
          {interactions && interactions.length > 0 ? (
            <div className="relative space-y-4 pl-4">
              <div className="absolute left-0 top-2 bottom-2 w-px bg-border" />
              {interactions.map((interaction) => {
                const typeInfo =
                  INTERACTION_TYPE_MAP[interaction.type as InteractionType] ??
                  INTERACTION_TYPE_MAP["other"];
                return (
                  <div key={interaction.id} className="relative">
                    <div className="absolute -left-[17px] top-1 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-sm">
                      {typeInfo.emoji}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(interaction.date), "MMM d, yyyy")}
                      <span className="ml-2 text-muted-foreground/60">{typeInfo.label}</span>
                    </p>
                    <p className="mt-0.5 text-sm">{interaction.note}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No interactions logged yet.</p>
          )}
        </section>
      </div>

      <LogInteractionDialog contactId={id} />
    </div>
  );
}
