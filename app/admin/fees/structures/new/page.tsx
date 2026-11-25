import { FeeStructureForm } from "@/app/components/fees/FeeStructureForm";
import { PageHeader } from "@/app/components/fees/ui";

export default function NewFeeStructurePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="New fee structure" description="Define what a class pays. Students are billed as soon as you save." />
      <FeeStructureForm />
    </div>
  );
}
