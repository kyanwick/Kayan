"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export function DismissFollowUp({ contactId }: { contactId: string }) {
  const router = useRouter();

  async function dismiss() {
    const supabase = createClient();
    await supabase.from("contacts").update({ follow_up_at: null }).eq("id", contactId);
    toast.success("Follow-up cleared");
    router.refresh();
  }

  return (
    <button
      onClick={dismiss}
      className="shrink-0 rounded-full border border-yellow-500/30 px-3 py-1 text-xs text-yellow-400 transition-colors hover:bg-yellow-500/20"
    >
      Done
    </button>
  );
}
