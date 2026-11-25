"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import { inr } from "@/app/components/fees/ui";

/**
 * Admin-only. Voiding keeps the receipt on record (marked VOID) and restores
 * the student's balance; it is the only way to correct a recorded payment.
 */
export function VoidReceiptDialog({
  receiptId,
  receiptNo,
  amount,
  onVoided,
  trigger,
}: {
  receiptId: string;
  receiptNo: string;
  amount: number;
  onVoided: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/fees/payments/${receiptId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not void the receipt");
      toast.success(`Receipt ${receiptNo} voided`);
      setOpen(false);
      setReason("");
      onVoided();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not void the receipt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
            <Ban className="mr-1.5 h-4 w-4" /> Void
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Void receipt {receiptNo}?</DialogTitle>
          <DialogDescription>
            {inr(amount)} will be added back to the student&apos;s balance. The receipt stays on record marked
            VOID, and this cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="void-reason">Reason</Label>
          <Textarea
            id="void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Cheque bounced, entered against the wrong student"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} disabled={busy || reason.trim().length < 3}>
            {busy ? "Voiding…" : "Void receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
