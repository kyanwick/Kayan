"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Camera, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const CATEGORIES = [
  { value: "creator", label: "Creator" },
  { value: "tech", label: "Tech" },
  { value: "muslim_community", label: "Muslim Community" },
  { value: "business", label: "Business" },
  { value: "personal", label: "Personal" },
];

function ChipInput({
  label,
  placeholder,
  items,
  onAdd,
  onRemove,
  color = "secondary",
}: {
  label: string;
  placeholder: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  color?: "green" | "amber" | "secondary";
}) {
  const [input, setInput] = useState("");

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      onAdd(input.trim());
      setInput("");
    }
  }

  const chipClass = {
    green: "bg-green-500/20 text-green-400 border-green-500/30",
    amber: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    secondary: "bg-secondary text-secondary-foreground border-border",
  }[color];

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 rounded-md border border-input bg-transparent p-2 min-h-[42px]">
        {items.map((item, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${chipClass}`}
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="hover:opacity-70"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={items.length === 0 ? placeholder : ""}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {input.trim() && (
        <button
          type="button"
          onClick={() => {
            onAdd(input.trim());
            setInput("");
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          Add &ldquo;{input.trim()}&rdquo;
        </button>
      )}
    </div>
  );
}

export default function NewContactPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [howWeMet, setHowWeMet] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [offers, setOffers] = useState<string[]>([]);
  const [needs, setNeeds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const supabase = createClient();

    // Ensure session is active
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("Not logged in — please sign in again");
      setLoading(false);
      return;
    }

    let photoUrl: string | null = null;

    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;
      const { data, error: uploadError } = await supabase.storage
        .from("contact-photos")
        .upload(fileName, photoFile);
      if (uploadError) {
        toast.error("Photo upload failed — saving without photo");
      } else if (data) {
        const { data: urlData } = supabase.storage
          .from("contact-photos")
          .getPublicUrl(data.path);
        photoUrl = urlData.publicUrl;
      }
    }

    const { data: contact, error } = await supabase
      .from("contacts")
      .insert({
        name: name.trim(),
        archived: false,
        category: category || null,
        how_we_met: howWeMet.trim() || null,
        notes: notes.trim() || null,
        photo_url: photoUrl,
        email: email.trim() || null,
        phone: phone.trim() || null,
        birthday: birthday || null,
        instagram: instagram.replace(/^@/, "").trim() || null,
        twitter: twitter.replace(/^@/, "").trim() || null,
        linkedin: linkedin.replace(/^@/, "").trim() || null,
        tiktok: tiktok.replace(/^@/, "").trim() || null,
      })
      .select()
      .single();

    if (error || !contact) {
      const msg = error
        ? `${error.message} (${error.code})`
        : "Insert returned no data";
      console.error("Save contact error:", error);
      toast.error(msg);
      setLoading(false);
      return;
    }

    await Promise.all([
      offers.length > 0
        ? supabase
            .from("contact_offers")
            .insert(offers.map((text) => ({ contact_id: contact.id, text })))
        : null,
      needs.length > 0
        ? supabase
            .from("contact_needs")
            .insert(needs.map((text) => ({ contact_id: contact.id, text })))
        : null,
      tags.length > 0
        ? supabase
            .from("contact_tags")
            .insert(tags.map((tag) => ({ contact_id: contact.id, tag })))
        : null,
    ]);

    toast.success(`${name} added to your network`);
    router.push(`/contacts/${contact.id}`);
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen pb-10">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-lg flex items-center gap-3">
          <button onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="font-semibold">New contact</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {/* Photo */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative"
          >
            <Avatar className="h-24 w-24">
              <AvatarImage src={photoPreview ?? undefined} />
              <AvatarFallback className="text-2xl font-semibold">
                {initials || <Camera className="h-8 w-8 text-muted-foreground" />}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="h-6 w-6 text-white" />
            </div>
          </button>
          <span className="text-xs text-muted-foreground">Tap to add photo (max 5MB)</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Contact info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="birthday">Birthday</Label>
          <Input
            id="birthday"
            type="date"
            value={birthday}
            onChange={(e) => setBirthday(e.target.value)}
          />
        </div>

        {/* Social handles */}
        <div className="space-y-3">
          <Label>Social media</Label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-pink-400">📸</span>
              <Input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="Instagram"
                className="pl-8"
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">𝕏</span>
              <Input
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="X / Twitter"
                className="pl-8"
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-400">in</span>
              <Input
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="LinkedIn"
                className="pl-8"
              />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-purple-400">🎵</span>
              <Input
                value={tiktok}
                onChange={(e) => setTiktok(e.target.value)}
                placeholder="TikTok"
                className="pl-8"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Enter handles with or without @</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="how_we_met">How we met</Label>
          <Input
            id="how_we_met"
            value={howWeMet}
            onChange={(e) => setHowWeMet(e.target.value)}
            placeholder="At a meetup, through mutual friend..."
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth remembering..."
            rows={3}
          />
        </div>

        <ChipInput
          label="What they offer"
          placeholder="Video editing, brand deals... (press Enter)"
          items={offers}
          onAdd={(v) => setOffers([...offers, v])}
          onRemove={(i) => setOffers(offers.filter((_, idx) => idx !== i))}
          color="green"
        />

        <ChipInput
          label="What they need"
          placeholder="A developer, investors... (press Enter)"
          items={needs}
          onAdd={(v) => setNeeds([...needs, v])}
          onRemove={(i) => setNeeds(needs.filter((_, idx) => idx !== i))}
          color="amber"
        />

        <ChipInput
          label="Tags"
          placeholder="Fanshawe, collab, investor... (press Enter)"
          items={tags}
          onAdd={(v) => setTags([...tags, v])}
          onRemove={(i) => setTags(tags.filter((_, idx) => idx !== i))}
          color="secondary"
        />

        <Button type="submit" className="w-full h-12" disabled={loading || !name.trim()}>
          {loading ? "Saving..." : "Add contact"}
        </Button>
      </form>
    </div>
  );
}
