import { NextResponse } from "next/server";
import { FeeError } from "@/lib/fees/service";

/** Map a thrown error to a JSON response; FeeErrors carry their own status. */
export function feeErrorResponse(err: unknown, context: string): NextResponse {
  if (err instanceof FeeError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(`[fees] ${context} failed:`, err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
