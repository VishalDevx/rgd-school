"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TransactionType, PaymentMethod } from "@/lib/enums";

interface ExpenseCategory {
  id: string;
  name: string;
}

interface ExpenseForm {
  title: string;
  description: string;
  amount: string;
  date: string;
  transaction: TransactionType;
  categoryId: string;
  paidTo: string;
  paymentMode: string;
}

const PAYMENT_MODES = ["CASH", "UPI", "BANK", "CHEQUE", "CARD", "ONLINE"] as const;

export default function NewExpensePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  const [form, setForm] = useState<ExpenseForm>({
    title: "",
    description: "",
    amount: "",
    date: "",
    transaction: TransactionType.DEBIT,
    categoryId: "",
    paidTo: "",
    paymentMode: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [billFile, setBillFile] = useState<File | null>(null);

  useEffect(() => {
    fetch("/api/expenses/categories")
      .then((res) => res.json())
      .then(setCategories)
      .catch(() => setError("Failed to load categories"));
  }, []);

  const onChange = <K extends keyof ExpenseForm>(
    key: K,
    value: ExpenseForm[K]
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }

    const amount = Number(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      setError("Amount must be a valid positive number");
      return;
    }

    setSubmitting(true);

    try {
      let billUrl = "";
      if (billFile) {
        const uploadData = new FormData();
        uploadData.append("file", billFile);
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: uploadData,
        });
        if (!uploadRes.ok) throw new Error("Failed to upload bill");
        const uploadResult = await uploadRes.json();
        billUrl = uploadResult.url ?? "";
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount,
          categoryId: form.categoryId || null,
          paidTo: form.paidTo || null,
          paymentMode: form.paymentMode || null,
          billUrl: billUrl || null,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      router.push("/admin/expenses");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create expense"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">New Expense</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={form.title}
            onChange={(e) => onChange("title", e.target.value)}
            required
          />
        </div>

        {/* Amount + Transaction */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded border px-3 py-2"
              value={form.amount}
              onChange={(e) => onChange("amount", e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Transaction Type
            </label>
            <select
              className="w-full rounded border px-3 py-2"
              value={form.transaction}
              onChange={(e) =>
                onChange("transaction", e.target.value as TransactionType)
              }
            >
              <option value={TransactionType.DEBIT}>Debit (Expense)</option>
              <option value={TransactionType.CREDIT}>Credit (Income)</option>
            </select>
          </div>
        </div>

        {/* Category + Paid To */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              className="w-full rounded border px-3 py-2"
              value={form.categoryId}
              onChange={(e) => onChange("categoryId", e.target.value)}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Paid To</label>
            <input
              className="w-full rounded border px-3 py-2"
              value={form.paidTo}
              onChange={(e) => onChange("paidTo", e.target.value)}
            />
          </div>
        </div>

        {/* Payment Mode + Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Payment Mode</label>
            <select
              className="w-full rounded border px-3 py-2"
              value={form.paymentMode}
              onChange={(e) => onChange("paymentMode", e.target.value)}
            >
              <option value="">Select payment mode</option>
              {PAYMENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              className="w-full rounded border px-3 py-2"
              value={form.date}
              onChange={(e) => onChange("date", e.target.value)}
            />
          </div>
        </div>

        {/* Bill Upload */}
        <div>
          <label className="block text-sm font-medium mb-1">Bill Upload</label>
          <input
            type="file"
            accept="image/*,.pdf"
            className="w-full rounded border px-3 py-2"
            onChange={(e) => setBillFile(e.target.files?.[0] ?? null)}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Description (optional)
          </label>
          <textarea
            rows={4}
            className="w-full rounded border px-3 py-2"
            value={form.description}
            onChange={(e) => onChange("description", e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded border px-4 py-2"
            disabled={submitting}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className={`rounded px-4 py-2 text-white ${
              submitting
                ? "bg-blue-400"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {submitting ? "Creating..." : "Create Expense"}
          </button>
        </div>
      </form>
    </div>
  );
}
