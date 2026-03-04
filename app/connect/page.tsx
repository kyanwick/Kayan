"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Zap, ArrowRight, X, Copy, MessageCircle } from "lucide-react";
import { Nav } from "@/components/nav";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WarmthBadge } from "@/components/warmth-badge";
import { createClient } from "@/lib/supabase/client";
import { cn, dmUrl } from "@/lib/utils";
import { toast } from "sonner";

type Mode = "offers" | "needs";

interface MatchResult {
  contact_id: string;
  name: string;
  photo_url: string | null;
  last_touched_at: string | null;
  matched_text: string;
  phone?: string | null;
  instagram?: string | null;
}

interface BrowseItem {
  text: string;
  count: number;
}

interface ContactPickerItem {
  id: string;
  name: string;
  photo_url: string | null;
  phone: string | null;
  instagram: string | null;
}

// ─── Intro Sheet ────────────────────────────────────────────────────────────
function IntroSheet({
  target,
  onClose,
}: {
  target: MatchResult;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [contacts, setContacts] = useState<ContactPickerItem[]>([]);
  const [selected, setSelected] = useState<ContactPickerItem | null>(null);
  const [introMsg, setIntroMsg] = useState("");
  const [logging, setLogging] = useState(false);

  // Debounced contact search
  useEffect(() => {
    const timer = setTimeout(async () => {
      const supabase = createClient();
      if (!query.trim()) {
        const { data } = await supabase
          .from("contacts")
          .select("id, name, photo_url, phone, instagram")
          .eq("archived", false)
          .neq("id", target.contact_id)
          .order("name", { ascending: true })
          .limit(20);
        setContacts((data as ContactPickerItem[]) ?? []);
      } else {
        const { data } = await supabase
          .from("contacts")
          .select("id, name, photo_url, phone, instagram")
          .eq("archived", false)
          .neq("id", target.contact_id)
          .ilike("name", `%${query.trim()}%`)
          .limit(20);
        setContacts((data as ContactPickerItem[]) ?? []);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, target.contact_id]);

  function buildMessage(to: ContactPickerItem) {
    const firstName = target.name.split(" ")[0];
    const contactFirstName = to.name.split(" ")[0];
    const reach = target.phone
      ? target.phone
      : target.instagram
      ? `@${target.instagram.replace(/^@/, "")}`
      : "them directly";
    return `Hey ${contactFirstName} 👋 — you should meet ${firstName}! They ${target.matched_text.length < 40 ? `offer "${target.matched_text}"` : "might be a great connection"} and I think you two would click.\n\nHit them up: ${reach}`;
  }

  function handleSelect(c: ContactPickerItem) {
    setSelected(c);
    setIntroMsg(buildMessage(c));
  }

  async function handleLogIntro() {
    if (!selected) return;
    setLogging(true);
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    const note = `Intro made to ${selected.name}`;
    const noteB = `Intro made by you to ${target.name}`;

    await Promise.all([
      supabase.from("interactions").insert({
        contact_id: target.contact_id,
        note,
        date: today,
        type: "other",
      }),
      supabase.from("interactions").insert({
        contact_id: selected.id,
        note: noteB,
        date: today,
        type: "other",
      }),
    ]);
    toast.success("Intro logged on both contacts");
    setLogging(false);
    onClose();
  }

  const smsHref = selected?.phone
    ? `sms:${selected.phone}?&body=${encodeURIComponent(introMsg)}`
    : null;
  const igHref = selected?.instagram ? dmUrl("instagram", selected.instagram) : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="rounded-t-2xl border-t border-border bg-background p-5 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="mx-auto h-1 w-10 rounded-full bg-muted" />

        <div>
          <h2 className="font-semibold text-base">Make an intro</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Who do you want to introduce <span className="font-medium text-foreground">{target.name}</span> to?
          </p>
        </div>

        {!selected ? (
          <>
            {/* Contact picker */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search contacts…"
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {contacts.map((c) => {
                const initials = c.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 hover:bg-accent/30 text-left"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={c.photo_url ?? undefined} />
                      <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{c.name}</span>
                  </button>
                );
              })}
              {contacts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No contacts found</p>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Intro message */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Introducing</span>
              <span className="font-medium">{target.name}</span>
              <span className="text-muted-foreground">to</span>
              <button
                onClick={() => setSelected(null)}
                className="font-medium text-primary underline underline-offset-2"
              >
                {selected.name}
              </button>
            </div>

            <div className="rounded-xl border border-border bg-card p-3">
              <textarea
                value={introMsg}
                onChange={(e) => setIntroMsg(e.target.value)}
                className="w-full bg-transparent text-sm resize-none focus:outline-none leading-relaxed"
                rows={5}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(introMsg);
                  toast.success("Copied to clipboard");
                }}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-accent"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>

              {smsHref && (
                <a
                  href={smsHref}
                  className="flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-400 hover:bg-green-500/20"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Send to {selected.name.split(" ")[0]}
                </a>
              )}

              {igHref && (
                <a
                  href={igHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-2 text-sm text-pink-400 hover:bg-pink-500/20"
                >
                  <span className="text-base leading-none">📸</span>
                  IG DM {selected.name.split(" ")[0]}
                </a>
              )}

              <button
                onClick={handleLogIntro}
                disabled={logging}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {logging ? "Logging…" : "Log intro"}
              </button>
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Connect Page ───────────────────────────────────────────────────────
function ConnectPageInner() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>(
    (searchParams.get("mode") as Mode) ?? "offers"
  );
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [results, setResults] = useState<MatchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [allOffers, setAllOffers] = useState<BrowseItem[]>([]);
  const [allNeeds, setAllNeeds] = useState<BrowseItem[]>([]);
  const [browsePanelLoaded, setBrowsePanelLoaded] = useState(false);
  const [introTarget, setIntroTarget] = useState<MatchResult | null>(null);

  const search = useCallback(async (q: string, m: Mode) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const supabase = createClient();
    const table = m === "offers" ? "contact_offers" : "contact_needs";

    type MatchedItem = {
      text: string;
      contacts: {
        id: string;
        name: string;
        photo_url: string | null;
        last_touched_at: string | null;
        phone: string | null;
        instagram: string | null;
      } | null;
    };

    const { data: matchedItems } = await (supabase
      .from(table)
      .select(`text, contacts(id, name, photo_url, last_touched_at, phone, instagram)`)
      .ilike("text", `%${q.trim()}%`) as unknown as Promise<{ data: MatchedItem[] | null }>);

    if (matchedItems) {
      const seen = new Set<string>();
      const mapped: MatchResult[] = [];
      for (const item of matchedItems) {
        const contact = item.contacts;
        if (!contact || seen.has(contact.id)) continue;
        seen.add(contact.id);
        mapped.push({
          contact_id: contact.id,
          name: contact.name,
          photo_url: contact.photo_url,
          last_touched_at: contact.last_touched_at,
          matched_text: item.text,
          phone: contact.phone,
          instagram: contact.instagram,
        });
      }
      setResults(mapped);
    }
    setSearching(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      search(query, mode);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, mode, search]);

  useEffect(() => {
    if (browsePanelLoaded) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("contact_offers").select("text"),
      supabase.from("contact_needs").select("text"),
    ]).then(([{ data: offers }, { data: needs }]) => {
      if (offers) {
        const counts = new Map<string, number>();
        offers.forEach((o) => counts.set(o.text, (counts.get(o.text) ?? 0) + 1));
        setAllOffers(
          Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([text, count]) => ({ text, count }))
        );
      }
      if (needs) {
        const counts = new Map<string, number>();
        needs.forEach((n) => counts.set(n.text, (counts.get(n.text) ?? 0) + 1));
        setAllNeeds(
          Array.from(counts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([text, count]) => ({ text, count }))
        );
      }
      setBrowsePanelLoaded(true);
    });
  }, [browsePanelLoaded]);

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-4 py-4">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-5 w-5 text-yellow-400" />
            <h1 className="font-bold text-xl">Connect</h1>
          </div>

          <div className="flex rounded-lg bg-muted p-1 mb-3">
            <button
              onClick={() => { setMode("offers"); setResults([]); setQuery(""); }}
              className={cn(
                "flex-1 rounded-md py-1.5 text-sm font-medium transition-all",
                mode === "offers"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground"
              )}
            >
              Who offers X
            </button>
            <button
              onClick={() => { setMode("needs"); setResults([]); setQuery(""); }}
              className={cn(
                "flex-1 rounded-md py-1.5 text-sm font-medium transition-all",
                mode === "needs"
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground"
              )}
            >
              Who needs X
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                mode === "offers"
                  ? "Who offers... videography, dev work, design..."
                  : "Who needs... a developer, investors, a collab..."
              }
              className="pl-9"
              autoFocus
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-6">
        {/* Search results */}
        {query.trim() && (
          <section>
            {searching ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No one in your network{" "}
                  {mode === "offers" ? "offers" : "needs"} &ldquo;{query}&rdquo; yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {results.length} match{results.length !== 1 ? "es" : ""} for &ldquo;{query}&rdquo;
                </p>
                {results.map((result) => {
                  const initials = result.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  return (
                    <div
                      key={result.contact_id}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-4"
                    >
                      <Link href={`/contacts/${result.contact_id}`} className="shrink-0">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={result.photo_url ?? undefined} />
                          <AvatarFallback className="text-sm font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/contacts/${result.contact_id}`}>
                          <p className="font-semibold hover:underline">{result.name}</p>
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span
                            className={cn(
                              "font-medium",
                              mode === "offers" ? "text-green-400" : "text-amber-400"
                            )}
                          >
                            {mode === "offers" ? "Offers:" : "Needs:"}
                          </span>{" "}
                          {result.matched_text}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <WarmthBadge lastTouchedAt={result.last_touched_at} />
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setIntroTarget(result)}
                            className="flex items-center gap-1 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs text-purple-400 hover:bg-purple-500/20"
                          >
                            <ArrowRight className="h-3 w-3" />
                            Intro
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Browse panel */}
        {!query.trim() && (
          <section className="space-y-6">
            <p className="text-sm text-muted-foreground text-center">
              Search above, or browse what&apos;s in your network
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-green-400">
                  All offers
                </h3>
                <div className="space-y-2">
                  {allOffers.slice(0, 10).map((item) => (
                    <button
                      key={item.text}
                      onClick={() => { setMode("offers"); setQuery(item.text); }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-left transition-colors hover:bg-green-500/20"
                    >
                      <span className="truncate text-xs text-green-400">{item.text}</span>
                      {item.count > 1 && (
                        <span className="shrink-0 rounded-full bg-green-500/20 px-1.5 py-0.5 text-xs text-green-400">
                          {item.count}
                        </span>
                      )}
                    </button>
                  ))}
                  {allOffers.length === 0 && (
                    <p className="text-xs text-muted-foreground">None yet</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-400">
                  All needs
                </h3>
                <div className="space-y-2">
                  {allNeeds.slice(0, 10).map((item) => (
                    <button
                      key={item.text}
                      onClick={() => { setMode("needs"); setQuery(item.text); }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-left transition-colors hover:bg-amber-500/20"
                    >
                      <span className="truncate text-xs text-amber-400">{item.text}</span>
                      {item.count > 1 && (
                        <span className="shrink-0 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-xs text-amber-400">
                          {item.count}
                        </span>
                      )}
                    </button>
                  ))}
                  {allNeeds.length === 0 && (
                    <p className="text-xs text-muted-foreground">None yet</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <Nav />

      {/* Intro sheet */}
      {introTarget && (
        <IntroSheet target={introTarget} onClose={() => setIntroTarget(null)} />
      )}
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-foreground" /></div>}>
      <ConnectPageInner />
    </Suspense>
  );
}
