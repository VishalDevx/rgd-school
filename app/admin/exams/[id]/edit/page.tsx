"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { toast } from "sonner";
import { ExamCategory } from "@/lib/enums";

interface ClassType { id: string; name: string }
interface ExamForm {
  name: string;
  classId: string;
  startDate: string;
  endDate: string;
  category: ExamCategory;
  sequence?: number;
}

export default function EditExamPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [classes, setClasses] = useState<ClassType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<ExamForm>({
    name: "",
    classId: "",
    startDate: "",
    endDate: "",
    category: "UNIT_TEST",
    sequence: 1,
  });

  useEffect(() => {
    (async () => {
      try {
        const [examRes, classesRes] = await Promise.all([
          fetch(`/api/exams/${id}`),
          fetch("/api/classes"),
        ]);
        const exam = await examRes.json();
        const cData = (await classesRes.json())?.data ?? [];

        setClasses(cData);
        setForm({
          name: exam.name || "",
          classId: exam.classId || "",
          startDate: exam.startDate ? exam.startDate.split("T")[0] : "",
          endDate: exam.endDate ? exam.endDate.split("T")[0] : "",
          category: exam.category || "UNIT_TEST",
          sequence: exam.sequence || 1,
        });
      } catch {
        toast.error("Failed to load exam");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const updateForm = <K extends keyof ExamForm>(key: K, value: ExamForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onCategoryChange = (category: ExamCategory) => {
    setForm((prev) => ({
      ...prev,
      category,
      sequence: category === "UNIT_TEST" ? 1 : undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.category === "UNIT_TEST" && !form.sequence) {
      toast.error("Sequence is required for Unit Test");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/exams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Exam updated");
      router.push("/admin/exams");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit Exam</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Exam Name</Label>
                <Input value={form.name} onChange={(e) => updateForm("name", e.target.value)} required />
              </div>
              <div>
                <Label>Class</Label>
                <Select value={form.classId} onValueChange={(v) => updateForm("classId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => updateForm("startDate", e.target.value)} required />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => updateForm("endDate", e.target.value)} required />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={onCategoryChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(ExamCategory).map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.category === "UNIT_TEST" && (
                <div>
                  <Label>Unit Test Number</Label>
                  <Input type="number" min={1} value={form.sequence ?? ""} onChange={(e) => updateForm("sequence", Number(e.target.value))} required />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Updating..." : "Update Exam"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
