"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { FeeStatementView, useStatement } from "@/app/components/fees/FeeStatementView";
import { PageHeader } from "@/app/components/fees/ui";

export default function StudentFeesPage() {
  const { data, error, loading } = useStatement();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="My Fees"
        description="Your fee balance, due dates and payment receipts across all academic years."
        actions={
          <Button asChild>
            <Link href="/student/fees/slip">
              <FileText className="mr-2 h-4 w-4" /> Fee statement
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      ) : data ? (
        <FeeStatementView statement={data} receiptHref={(id) => `/student/fees/receipts/${id}`} />
      ) : null}
    </div>
  );
}
