"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";

/** Rebuilds every balance from receipts. Safe to run any time. */
export function RecalculateButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/fees/recalculate", { method: "POST" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Recalculation failed");
      toast.success(
        `Balances recalculated for ${body.accounts} account(s)` +
          (body.mergedDuplicates ? `, ${body.mergedDuplicates} duplicate(s) merged` : "")
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Recalculation failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" onClick={run} disabled={busy} title="Rebuild every balance from receipts">
      <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />
      {busy ? "Recalculating…" : "Recalculate"}
    </Button>
  );
}
