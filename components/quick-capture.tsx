"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bolt, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const HIDE_ON = ["/login", "/contacts/new"];

export function QuickCapture() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [howWeMet, setHowWeMet] = useState("");
  const [loading, setLoading] = useState(false);

  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        name: name.trim(),
        phone: phone.trim() || null,
        how_we_met: howWeMet.trim() || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      toast.error("Failed to save");
      setLoading(false);
      return;
    }

    const contactId = data.id;
    toast.success(`${name.trim()} saved!`, {
      action: {
        label: "Add details",
        onClick: () => router.push(`/contacts/${contactId}/edit`),
      },
    });

    setName("");
    setPhone("");
    setHowWeMet("");
    setOpen(false);
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      {/* FAB — sits above the bottom nav */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
          title="Quick add contact"
        >
          <Bolt className="h-5 w-5" />
        </button>
      )}

      {/* Slide-up sheet */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/60"
            onClick={() => setOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl border-t border-border bg-background p-6 pb-10 shadow-xl animate-in slide-in-from-bottom duration-200">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Quick add</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qc-name">Name *</Label>
                <Input
                  id="qc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qc-phone">Phone</Label>
                <Input
                  id="qc-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qc-met">Where did you meet?</Label>
                <Input
                  id="qc-met"
                  value={howWeMet}
                  onChange={(e) => setHowWeMet(e.target.value)}
                  placeholder="Conference, mutual friend..."
                />
              </div>
              <Button type="submit" className="w-full h-12" disabled={loading || !name.trim()}>
                {loading ? "Saving..." : "Save contact"}
              </Button>
            </form>
          </div>
        </>
      )}
    </>
  );
}
