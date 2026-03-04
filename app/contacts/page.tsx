"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Plus, LayoutGrid, List, SlidersHorizontal, Archive } from "lucide-react";
import { Nav } from "@/components/nav";
import { ContactCard } from "@/components/contact-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCategory, getWarmth, timeAgo } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WarmthBadge } from "@/components/warmth-badge";
import type { Contact } from "@/types";

const CATEGORIES = ["creator", "tech", "muslim_community", "business", "personal"];
const WARMTHS = ["hot", "warm", "cold"] as const;
const SORTS = [
  { value: "warmth", label: "Warmth" },
  { value: "last_touched", label: "Last touched" },
  { value: "name", label: "Name" },
  { value: "newest", label: "Newest" },
] as const;

type SortKey = (typeof SORTS)[number]["value"];

function getStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v !== null ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [warmthFilter, setWarmthFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("warmth");
  const [view, setView] = useState<"card" | "list">("card");
  const [showFilters, setShowFilters] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Restore preferences from localStorage on mount
  useEffect(() => {
    setView(getStored("kayan_view", "card" as "card" | "list"));
    setSort(getStored("kayan_sort", "warmth" as SortKey));
    setCategoryFilter(getStored("kayan_category", null as string | null));
    setWarmthFilter(getStored("kayan_warmth", null as string | null));
    setPrefsLoaded(true);
  }, []);

  // Persist preferences
  useEffect(() => {
    if (!prefsLoaded) return;
    localStorage.setItem("kayan_view", JSON.stringify(view));
    localStorage.setItem("kayan_sort", JSON.stringify(sort));
    localStorage.setItem("kayan_category", JSON.stringify(categoryFilter));
    localStorage.setItem("kayan_warmth", JSON.stringify(warmthFilter));
  }, [view, sort, categoryFilter, warmthFilter, prefsLoaded]);

  const fetchContacts = useCallback(async () => {
    if (!prefsLoaded) return;
    setLoading(true);
    const supabase = createClient();

    const trimmed = search.trim();

    if (trimmed) {
      // Multi-field search: gather IDs from tags, offers, needs
      const [
        { data: byName },
        { data: byNotes },
        { data: byTags },
        { data: byOffers },
        { data: byNeeds },
      ] = await Promise.all([
        supabase
          .from("contacts")
          .select("id")
          .eq("archived", showArchived)
          .ilike("name", `%${trimmed}%`)
          .then(({ data }) => ({ data: data?.map((c) => c.id) ?? [] })),
        supabase
          .from("contacts")
          .select("id")
          .eq("archived", showArchived)
          .ilike("notes", `%${trimmed}%`)
          .then(({ data }) => ({ data: data?.map((c) => c.id) ?? [] })),
        supabase
          .from("contact_tags")
          .select("contact_id")
          .ilike("tag", `%${trimmed}%`)
          .then(({ data }) => ({ data: data?.map((c) => c.contact_id) ?? [] })),
        supabase
          .from("contact_offers")
          .select("contact_id")
          .ilike("text", `%${trimmed}%`)
          .then(({ data }) => ({ data: data?.map((c) => c.contact_id) ?? [] })),
        supabase
          .from("contact_needs")
          .select("contact_id")
          .ilike("text", `%${trimmed}%`)
          .then(({ data }) => ({ data: data?.map((c) => c.contact_id) ?? [] })),
      ]);

      const allIds = [
        ...(byName as string[]),
        ...(byNotes as string[]),
        ...(byTags as string[]),
        ...(byOffers as string[]),
        ...(byNeeds as string[]),
      ];
      const uniqueIds = [...new Set(allIds)];

      if (uniqueIds.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      let query = supabase.from("contacts").select("*").in("id", uniqueIds);
      if (categoryFilter) query = query.eq("category", categoryFilter);
      const { data } = await query;
      let results = data ?? [];
      if (warmthFilter) {
        results = results.filter((c) => getWarmth(c.last_touched_at, c.created_at) === warmthFilter);
      }
      setContacts(sortContacts(results, sort));
    } else {
      let query = supabase.from("contacts").select("*").eq("archived", showArchived);
      if (categoryFilter) query = query.eq("category", categoryFilter);
      const { data } = await query;
      let results = data ?? [];
      if (warmthFilter) {
        results = results.filter((c) => getWarmth(c.last_touched_at, c.created_at) === warmthFilter);
      }
      setContacts(sortContacts(results, sort));
    }

    setLoading(false);
  }, [search, categoryFilter, warmthFilter, sort, showArchived, prefsLoaded]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function sortContacts(results: Contact[], s: SortKey): Contact[] {
    return results.sort((a, b) => {
      if (s === "name") return a.name.localeCompare(b.name);
      if (s === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (s === "last_touched") {
        if (!a.last_touched_at) return 1;
        if (!b.last_touched_at) return -1;
        return new Date(b.last_touched_at).getTime() - new Date(a.last_touched_at).getTime();
      }
      const order = { hot: 0, warm: 1, cold: 2 };
      return order[getWarmth(a.last_touched_at, a.created_at)] - order[getWarmth(b.last_touched_at, b.created_at)];
    });
  }

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto max-w-lg px-4 py-3 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, notes, tags, offers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && "bg-accent")}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setView(view === "card" ? "list" : "card")}
            >
              {view === "card" ? (
                <List className="h-4 w-4" />
              ) : (
                <LayoutGrid className="h-4 w-4" />
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="space-y-2 pb-1">
              {/* Category filter */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setCategoryFilter(null)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
                    !categoryFilter
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground"
                  )}
                >
                  All
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
                      categoryFilter === cat
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {formatCategory(cat)}
                  </button>
                ))}
              </div>
              {/* Warmth + Archived */}
              <div className="flex gap-2 flex-wrap">
                {WARMTHS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setWarmthFilter(warmthFilter === w ? null : w)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs capitalize transition-colors",
                      warmthFilter === w
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {w}
                  </button>
                ))}
                <button
                  onClick={() => setShowArchived(!showArchived)}
                  className={cn(
                    "flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors",
                    showArchived
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground"
                  )}
                >
                  <Archive className="h-3 w-3" />
                  Archived
                </button>
              </div>
              {/* Sort */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {SORTS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSort(s.value)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
                      sort === s.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Contact count */}
        {!loading && (
          <p className="mb-3 text-xs text-muted-foreground">
            {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
            {showArchived && " (archived)"}
          </p>
        )}

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">No contacts found</p>
            {!showArchived && (
              <Link href="/contacts/new" className="mt-2 inline-block text-sm underline">
                Add one
              </Link>
            )}
          </div>
        ) : view === "card" ? (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {contacts.map((contact) => {
              const initials = contact.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <Link
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  className="flex items-center gap-3 py-3 hover:opacity-70 transition-opacity"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={contact.photo_url ?? undefined} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 truncate text-sm font-medium">{contact.name}</span>
                  <WarmthBadge lastTouchedAt={contact.last_touched_at} createdAt={contact.created_at} />
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {timeAgo(contact.last_touched_at)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Link
        href="/contacts/new"
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </Link>

      <Nav />
    </div>
  );
}
