"use client";

import { useParams } from "next/navigation";
import { FeeReceiptClient } from "@/app/components/FeeReceiptClient";

export default function StudentReceiptPage() {
  const params = useParams<{ id: string }>();
  return <FeeReceiptClient paymentId={params?.id ?? ""} backHref="/student/fees" />;
}
