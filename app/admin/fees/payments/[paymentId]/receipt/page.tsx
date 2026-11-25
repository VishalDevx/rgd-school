"use client";

import { useParams } from "next/navigation";
import { FeeReceiptClient } from "@/app/components/FeeReceiptClient";
import { VoidReceiptDialog } from "@/app/components/fees/VoidReceiptDialog";

export default function PaymentReceiptPage() {
  const params = useParams<{ paymentId: string }>();
  const paymentId = params?.paymentId ?? "";

  return (
    <FeeReceiptClient
      paymentId={paymentId}
      backHref="/admin/fees/payments"
      actions={(data, reload) =>
        data.receipt.voided ? null : (
          <VoidReceiptDialog
            receiptId={data.receipt.id}
            receiptNo={data.receipt.receiptNo}
            amount={data.receipt.amount}
            onVoided={reload}
          />
        )
      }
    />
  );
}
