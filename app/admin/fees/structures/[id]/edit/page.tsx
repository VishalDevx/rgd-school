"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { toast } from "sonner";

interface FeeStructureForm {
  classId: string;
  categoryId: string;
  name: string;
  examFee: string;
  transportFee: string;
  miscFee: string;
  monthlyFee: string;
  totalMonths: string;
}

interface ClassType {
  id: string;
  name: string;
}

interface FeeCategoryType {
  id: string;
  name: string;
}

export default function EditFeeStructurePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [classes, setClasses] = useState<ClassType[]>([]);
  const [categories, setCategories] = useState<FeeCategoryType[]>([]);
  const [form, setForm] = useState<FeeStructureForm>({
    classId: "",
    categoryId: "",
    name: "",
    examFee: "",
    transportFee: "",
    miscFee: "",
    monthlyFee: "",
    totalMonths: "12",
  });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch("/api/classes").then((res) => res.json()),
      fetch("/api/fees/categories").then((res) => res.json()),
      fetch(`/api/fees/structures/${id}`).then((res) => res.json()),
    ])
      .then(([classesRes, categoriesData, structure]) => {
        if (classesRes.success && Array.isArray(classesRes.data)) {
          setClasses(classesRes.data);
        }
        setCategories(categoriesData);
        setForm({
          classId: structure.classId ?? "",
          categoryId: structure.categoryId ?? "",
          name: structure.name ?? "",
          examFee: structure.examFee?.toString() ?? "",
          transportFee: structure.transportFee?.toString() ?? "",
          miscFee: structure.miscFee?.toString() ?? "",
          monthlyFee: structure.monthlyFee?.toString() ?? "",
          totalMonths: structure.totalMonths?.toString() ?? "12",
        });
      })
      .catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, [id]);

  const monthlyAmount = Number(form.monthlyFee) || 0;
  const months = Number(form.totalMonths) || 12;
  const calculatedAnnual = monthlyAmount > 0 ? monthlyAmount * months : 0;

  const onChange = (key: keyof FeeStructureForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/fees/structures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success("Fee structure updated successfully!");
      router.push("/admin/fees/structures");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating fee structure";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Fee Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="classId">Class</Label>
                <Select
                  value={form.classId}
                  onValueChange={(val) => onChange("classId", val)}
                  required
                >
                  <SelectTrigger id="classId">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="categoryId">Fee Category</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(val) => onChange("categoryId", val)}
                >
                  <SelectTrigger id="categoryId">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  placeholder="Structure name (optional)"
                  onChange={(e) => onChange("name", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="examFee">Exam Fee</Label>
                <Input
                  id="examFee"
                  type="number"
                  value={form.examFee}
                  onChange={(e) => onChange("examFee", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="transportFee">Transport Fee</Label>
                <Input
                  id="transportFee"
                  type="number"
                  value={form.transportFee}
                  onChange={(e) => onChange("transportFee", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="miscFee">Miscellaneous Fee</Label>
                <Input
                  id="miscFee"
                  type="number"
                  value={form.miscFee}
                  onChange={(e) => onChange("miscFee", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="monthlyFee">Monthly Fee</Label>
                <Input
                  id="monthlyFee"
                  type="number"
                  value={form.monthlyFee}
                  onChange={(e) => onChange("monthlyFee", e.target.value)}
                  placeholder="e.g. 450"
                />
              </div>

              <div>
                <Label htmlFor="totalMonths">Total Months</Label>
                <Input
                  id="totalMonths"
                  type="number"
                  value={form.totalMonths}
                  onChange={(e) => onChange("totalMonths", e.target.value)}
                  placeholder="e.g. 12"
                  min="1"
                />
              </div>
            </div>

            {monthlyAmount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700 font-medium">
                  Annual Fee Preview: ₹{monthlyAmount}/month × {months} months = <span className="text-lg font-bold">₹{calculatedAnnual.toLocaleString()}</span>
                </p>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Update"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
