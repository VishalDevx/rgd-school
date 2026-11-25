import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AlertTriangle, ArrowRight, CalendarDays, HandCoins, Percent, Wallet } from "lucide-react";
import { authOption } from "@/app/lib/auth";
import { getFeeOverview } from "@/lib/fees/service";
import { Button } from "@/app/components/ui/button";
import { CollectionTrendChart } from "@/app/components/fees/CollectionTrendChart";
import { RecalculateButton } from "@/app/components/fees/RecalculateButton";
import { EmptyState, PageHeader, PaidBar, StatTile, fmtDate, inr, modeLabel } from "@/app/components/fees/ui";

export const dynamic = "force-dynamic";

export default async function AdminFeesPage() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const o = await getFeeOverview();
  const totalAccounts = o.accounts.paid + o.accounts.partial + o.accounts.pending;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Fees"
        description="Collections, outstanding balances and recent receipts at a glance."
        actions={
          <>
            <RecalculateButton />
            <Button asChild variant="outline">
              <Link href="/admin/fees/structures">Structures</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/fees/payments/new">
                <HandCoins className="mr-2 h-4 w-4" /> Collect fee
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Collected (all time)" value={inr(o.collected)} hint={`${o.receipts} receipts`}
          icon={<Wallet className="h-4 w-4" />} tone="green" />
        <StatTile label="This month" value={inr(o.collectedThisMonth)} hint={`${o.receiptsThisMonth} receipts`}
          icon={<CalendarDays className="h-4 w-4" />} tone="blue" />
        <StatTile label="Outstanding" value={inr(o.outstanding)}
          hint={o.concessions > 0 ? `after ${inr(o.concessions)} in concessions` : `${o.accounts.pending + o.accounts.partial} open accounts`}
          icon={<Percent className="h-4 w-4" />} tone="amber" />
        <StatTile label="Overdue" value={inr(o.overdue)}
          hint={o.overdueStudents ? `${o.overdueStudents} student${o.overdueStudents === 1 ? "" : "s"} past due` : "nothing overdue"}
          icon={<AlertTriangle className="h-4 w-4" />} tone={o.overdue > 0 ? "red" : "slate"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="font-semibold text-gray-900">Monthly collection</h2>
          <p className="text-sm text-gray-500">Last 6 months, voided receipts excluded</p>
          <div className="mt-4">
            <CollectionTrendChart data={o.trend} />
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">Collection rate</h2>
          <p className="text-sm text-gray-500">Paid out of everything billed</p>
          <p className="mt-4 text-4xl font-semibold tabular-nums tracking-tight text-gray-900">{o.collectionRate}%</p>
          <PaidBar className="mt-3 h-2" paid={o.collectionRate} payable={100} />
          <dl className="mt-6 space-y-3 text-sm">
            {[
              { label: "Fully paid", value: o.accounts.paid, dot: "bg-emerald-500" },
              { label: "Part paid", value: o.accounts.partial, dot: "bg-amber-500" },
              { label: "Not started", value: o.accounts.pending, dot: "bg-slate-400" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <dt className="flex items-center gap-2 text-gray-600">
                  <span className={`h-2 w-2 rounded-full ${r.dot}`} aria-hidden /> {r.label}
                </dt>
                <dd className="tabular-nums text-gray-900">
                  {r.value}
                  <span className="text-gray-400"> / {totalAccounts}</span>
                </dd>
              </div>
            ))}
          </dl>
          <Button asChild variant="ghost" size="sm" className="mt-4 px-0 text-blue-600 hover:bg-transparent">
            <Link href="/admin/fees/dues">See who owes <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="border-b border-gray-100 px-5 py-3">
            <h2 className="font-semibold text-gray-900">By class</h2>
          </header>
          {o.byClass.length === 0 ? (
            <EmptyState title="No fee structures yet">
              <Link href="/admin/fees/structures/new" className="text-blue-600 hover:underline">Create one</Link> to start billing.
            </EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50/70 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Class</th>
                  <th className="px-5 py-2.5 font-medium">Collected</th>
                  <th className="px-5 py-2.5 text-right font-medium">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {o.byClass.map((c) => (
                  <tr key={c.classId}>
                    <td className="px-5 py-3 font-medium text-gray-900">{c.className}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <PaidBar className="max-w-[140px]" paid={c.paid} payable={c.payable} />
                        <span className="w-10 text-right text-xs tabular-nums text-gray-500">{c.rate}%</span>
                      </div>
                      <span className="text-xs tabular-nums text-gray-500">{inr(c.paid)} of {inr(c.payable)}</span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-gray-900">{inr(c.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h2 className="font-semibold text-gray-900">Recent receipts</h2>
            <Link href="/admin/fees/payments" className="text-sm font-medium text-blue-600 hover:underline">View all</Link>
          </header>
          {o.recent.length === 0 ? (
            <EmptyState title="No payments yet" />
          ) : (
            <ul className="divide-y divide-gray-100">
              {o.recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/fees/payments/${r.id}/receipt`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-gray-50/60">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-gray-900">{r.student.name}</span>
                      <span className="block text-xs text-gray-500">
                        {r.receiptNo} · {fmtDate(r.paymentDate)} · {modeLabel(r.paymentMode)}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums text-gray-900">{inr(r.amount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
