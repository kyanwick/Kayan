import Link from "next/link";
import { Plus, Flame, Clock, Users, CalendarCheck, LogOut, Upload } from "lucide-react";
import { Nav } from "@/components/nav";
import { ContactCard } from "@/components/contact-card";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/server";
import { format, startOfMonth, differenceInDays } from "date-fns";
import { dmUrl } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);
  const monthStart = startOfMonth(now).toISOString();

  const [
    { count: totalContacts },
    { count: interactionsThisMonth },
    { data: followUpsDue },
    { data: goingCold },
    { data: recentlyAdded },
    { data: allWithBirthdays },
  ] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("archived", false),
    supabase.from("interactions").select("*", { count: "exact", head: true }).gte("date", monthStart),
    // Follow-ups due today or overdue
    supabase
      .from("contacts")
      .select("*")
      .eq("archived", false)
      .lte("follow_up_at", todayStr)
      .not("follow_up_at", "is", null)
      .order("follow_up_at", { ascending: true })
      .limit(5),
    supabase
      .from("contacts")
      .select("*")
      .eq("archived", false)
      .or(`last_touched_at.is.null,last_touched_at.lt.${thirtyDaysAgo.toISOString()}`)
      .order("last_touched_at", { ascending: true, nullsFirst: true })
      .limit(5),
    supabase
      .from("contacts")
      .select("*")
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("contacts")
      .select("id, name, photo_url, phone, instagram, birthday, last_touched_at, created_at")
      .eq("archived", false)
      .not("birthday", "is", null),
  ]);

  // Upcoming birthdays (next 7 days)
  const upcomingBirthdays = (allWithBirthdays ?? []).filter((c) => {
    if (!c.birthday) return false;
    const bday = new Date(c.birthday + "T12:00:00");
    for (let i = 0; i <= 7; i++) {
      const check = new Date(now);
      check.setDate(check.getDate() + i);
      if (bday.getMonth() === check.getMonth() && bday.getDate() === check.getDate()) return true;
    }
    return false;
  });

  // "Reach out today" suggestions (up to 3, combining follow-ups + birthdays + getting cold)
  const followUpIds = new Set((followUpsDue ?? []).map((c) => c.id));
  const birthdayContactIds = new Set(upcomingBirthdays.slice(0, 3).map((c) => c.id));

  // Getting cold = 20-30 days since last touch (not yet cold, about to be)
  const { data: gettingCold } = await supabase
    .from("contacts")
    .select("id, name, photo_url, phone, instagram, last_touched_at, created_at")
    .eq("archived", false)
    .lt("last_touched_at", thirtyDaysAgo.toISOString())
    .gte("last_touched_at", twentyDaysAgo.toISOString())
    .order("last_touched_at", { ascending: true })
    .limit(3);

  type SuggestionContact = {
    id: string;
    name: string;
    photo_url: string | null;
    phone: string | null;
    instagram: string | null;
    last_touched_at?: string | null;
    created_at?: string;
    birthday?: string | null;
    reason: string;
    daysUntilBirthday?: number;
  };

  const suggestions: SuggestionContact[] = [];
  const seenIds = new Set<string>();

  // 1. follow-up due
  for (const c of followUpsDue ?? []) {
    if (seenIds.has(c.id) || suggestions.length >= 3) break;
    seenIds.add(c.id);
    suggestions.push({ ...c, reason: "Follow-up due" });
  }

  // 2. birthdays
  for (const c of upcomingBirthdays) {
    if (seenIds.has(c.id) || suggestions.length >= 3) break;
    const bday = new Date(c.birthday! + "T12:00:00");
    let daysUntil = 0;
    for (let i = 0; i <= 7; i++) {
      const check = new Date(now);
      check.setDate(check.getDate() + i);
      if (bday.getMonth() === check.getMonth() && bday.getDate() === check.getDate()) {
        daysUntil = i;
        break;
      }
    }
    seenIds.add(c.id);
    suggestions.push({
      id: c.id,
      name: c.name,
      photo_url: c.photo_url,
      phone: c.phone,
      instagram: c.instagram,
      birthday: c.birthday,
      reason: daysUntil === 0 ? "🎂 Birthday today!" : `🎂 Birthday in ${daysUntil}d`,
      daysUntilBirthday: daysUntil,
    });
  }

  // 3. getting cold
  for (const c of gettingCold ?? []) {
    if (seenIds.has(c.id) || suggestions.length >= 3) break;
    const days = c.last_touched_at ? differenceInDays(now, new Date(c.last_touched_at)) : 999;
    seenIds.add(c.id);
    suggestions.push({ ...c, reason: `Getting cold · ${days}d ago` });
  }

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-4 py-4">
        <div className="mx-auto max-w-lg flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Kayan</h1>
            <p className="text-xs text-muted-foreground">{format(now, "EEEE, MMM d")}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/import"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
              title="Import contacts"
            >
              <Upload className="h-4 w-4" />
            </Link>
            <Link
              href="/contacts/new"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95"
            >
              <Plus className="h-5 w-5" />
            </Link>
            <SignOutButton />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg space-y-6 px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-xs">Total contacts</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{totalContacts ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Touches this month</span>
            </div>
            <p className="mt-2 text-3xl font-bold">{interactionsThisMonth ?? 0}</p>
          </div>
        </div>

        {/* Reach out today */}
        {suggestions.length > 0 && (
          <section>
            <h2 className="mb-3 font-semibold">Reach out today</h2>
            <div className="space-y-2">
              {suggestions.map((s) => {
                const initials = s.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                const smsHref = s.phone
                  ? `sms:${s.phone}?&body=${encodeURIComponent(`Hey ${s.name.split(" ")[0]}! 👋`)}`
                  : null;
                const igHref = s.instagram ? dmUrl("instagram", s.instagram) : null;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    <Link href={`/contacts/${s.id}`}>
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/contacts/${s.id}`}>
                        <p className="truncate font-semibold text-sm">{s.name}</p>
                      </Link>
                      <p className="text-xs text-muted-foreground">{s.reason}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {smsHref && (
                        <a
                          href={smsHref}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20 text-green-400 text-sm hover:bg-green-500/30"
                          title="Send text"
                        >
                          💬
                        </a>
                      )}
                      {igHref && (
                        <a
                          href={igHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-500/20 text-pink-400 text-sm hover:bg-pink-500/30"
                          title="Instagram DM"
                        >
                          📸
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Follow-ups due */}
        {followUpsDue && followUpsDue.length > 0 && (
          <section>
            <div className="mb-3 flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-yellow-400" />
              <h2 className="font-semibold">Follow-ups due</h2>
            </div>
            <div className="space-y-2">
              {followUpsDue.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          </section>
        )}

        {/* Birthdays */}
        {upcomingBirthdays.length > 0 && (
          <section>
            <h2 className="mb-3 font-semibold">Birthdays this week</h2>
            <div className="space-y-2">
              {upcomingBirthdays.map((contact) => {
                const bday = new Date(contact.birthday! + "T12:00:00");
                const isToday =
                  bday.getMonth() === now.getMonth() && bday.getDate() === now.getDate();
                return (
                  <Link
                    key={contact.id}
                    href={`/contacts/${contact.id}`}
                    className="flex items-center gap-3 rounded-xl border border-pink-500/20 bg-pink-500/10 p-4 transition-colors hover:bg-pink-500/20"
                  >
                    <span className="text-xl">🎂</span>
                    <div>
                      <p className="font-semibold">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {isToday ? "Today!" : format(bday, "MMMM d")}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Going Cold */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Flame className="h-4 w-4 text-blue-400" />
            <h2 className="font-semibold">Going cold</h2>
          </div>
          {goingCold && goingCold.length > 0 ? (
            <div className="space-y-2">
              {goingCold.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">You&apos;re on top of your network 🔥</p>
            </div>
          )}
        </section>

        {/* Recently Added */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recently added</h2>
            <Link href="/contacts" className="text-xs text-muted-foreground hover:text-foreground">
              See all
            </Link>
          </div>
          {recentlyAdded && recentlyAdded.length > 0 ? (
            <div className="space-y-2">
              {recentlyAdded.map((contact) => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">No contacts yet</p>
              <Link href="/contacts/new" className="mt-2 inline-block text-sm text-foreground underline">
                Add your first contact
              </Link>
            </div>
          )}
        </section>
      </div>

      <Nav />
    </div>
  );
}
