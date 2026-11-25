import { z } from "zod";
import { PaymentMethod } from "@/lib/enums";

/** "" / null / undefined -> undefined, otherwise a finite number >= 0. */
const optionalAmount = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number({ invalid_type_error: "Must be a number" }).finite().min(0, "Cannot be negative").optional()
);

const optionalText = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : v ?? undefined),
  z.string().max(500).optional()
);

const optionalDate = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  z.coerce.date().optional()
);

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Invalid id");

export const feeStructureInput = z
  .object({
    classId: objectId,
    categoryId: z.preprocess((v) => (v ? v : undefined), objectId.optional()),
    name: optionalText,
    monthlyFee: optionalAmount,
    totalMonths: z.preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
      z.number().int().min(1).max(24).optional()
    ),
    examFee: optionalAmount,
    transportFee: optionalAmount,
    miscFee: optionalAmount,
    dueDate: optionalDate,
    isOptional: z.boolean().optional(),
  })
  .refine(
    (v) => (v.monthlyFee ?? 0) + (v.examFee ?? 0) + (v.miscFee ?? 0) + (v.transportFee ?? 0) > 0,
    { message: "Enter at least one fee amount", path: ["monthlyFee"] }
  );

export type FeeStructureInput = z.infer<typeof feeStructureInput>;

export const paymentInput = z
  .object({
    studentId: objectId,
    feeStructureId: objectId,
    // `amountPaid` is accepted for callers written against the old API.
    amount: optionalAmount,
    amountPaid: optionalAmount,
    discount: optionalAmount,
    lateFine: optionalAmount,
    paymentMode: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
    paymentDate: optionalDate,
    referenceNo: optionalText,
    remarks: optionalText,
  })
  .transform(({ amountPaid, amount, ...rest }) => ({
    ...rest,
    amount: amount ?? amountPaid ?? 0,
    discount: rest.discount ?? 0,
    lateFine: rest.lateFine ?? 0,
  }))
  .refine((v) => !v.paymentDate || v.paymentDate.getTime() <= Date.now() + 24 * 3600 * 1000, {
    message: "Payment date cannot be in the future",
    path: ["paymentDate"],
  });

export type PaymentInput = z.infer<typeof paymentInput>;

export const voidInput = z.object({
  reason: z.string().trim().min(3, "Give a reason (at least 3 characters)").max(300),
});

/** First zod issue as a single human-readable string. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  const field = issue.path.join(".");
  return field ? `${field}: ${issue.message}` : issue.message;
}
