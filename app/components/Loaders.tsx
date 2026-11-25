/**
 * Loading UI shared by `loading.tsx` route files and the auth guards.
 * Pure markup + Tailwind (no client JS), so it shows instantly.
 */

import { cn } from "@/app/lib/utils";

/** Full-screen branded loader: first visit, login check, sign-in redirect. */
export function AppSplash({ message = "Loading…" }: { message?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-emerald-50"
    >
      <div className="relative h-24 w-24">
        {/* Spinning ring around the logo */}
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600 [animation-duration:900ms]" />
        <div className="absolute inset-2 overflow-hidden rounded-full bg-white shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element -- must render before JS/hydration */}
          <img src="/logo.jpeg" alt="" className="h-full w-full object-cover" />
        </div>
      </div>
      <p className="mt-6 text-lg font-semibold tracking-tight text-gray-900">RGD Modern Academy</p>
      <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
        {message}
      </p>
      <div className="mt-5 h-1 w-40 overflow-hidden rounded-full bg-blue-100">
        <div className="h-full w-1/3 animate-[loader-slide_1.1s_ease-in-out_infinite] rounded-full bg-blue-600" />
      </div>
    </div>
  );
}

function Bone({ className = "" }: { className?: string }) {
  // cn() lets a caller's `rounded-full` replace the default `rounded-lg`.
  return <div className={cn("animate-pulse rounded-lg bg-gray-200/80", className)} />;
}

/**
 * Skeleton of a typical portal page (title, stat tiles, table). Rendered
 * inside the sidebar layout, so navigation feels instant.
 */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="mx-auto max-w-7xl space-y-6">
      <span className="sr-only">Loading…</span>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Bone className="h-7 w-56" />
          <Bone className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-28" />
          <Bone className="h-9 w-32" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <Bone className="h-4 w-24" />
              <Bone className="h-8 w-8" />
            </div>
            <Bone className="mt-3 h-7 w-28" />
            <Bone className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex gap-3 border-b border-gray-100 p-4">
          <Bone className="h-9 flex-1" />
          <Bone className="h-9 w-36" />
          <Bone className="h-9 w-36" />
        </div>
        <div className="divide-y divide-gray-100">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4" style={{ opacity: 1 - i * 0.1 }}>
              <Bone className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Bone className="h-4 w-1/3" />
                <Bone className="h-3 w-1/4" />
              </div>
              <Bone className="hidden h-4 w-24 md:block" />
              <Bone className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
