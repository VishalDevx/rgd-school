"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

/* ---------- Types ---------- */

interface ClassType {
  id: string;
  name: string;
}

interface ExamForm {
  name: string;
  classId: string;
  startDate: string;
  endDate: string;
  category: ExamCategory;
  sequence?: number;
}

/* ---------- Component ---------- */

export default function NewExamPage() {
  const router = useRouter();

  const [classes, setClasses] = useState<ClassType[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<ExamForm>({
    name: "",
    classId: "",
    startDate: "",
    endDate: "",
    category: "UNIT_TEST",
    sequence: 1,
  });

  /* ---------- Fetch Classes ---------- */

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/classes");
        if (!res.ok) throw new Error("Failed to fetch classes");

        const data: ClassType[] = (await res.json())?.data ?? [];
        setClasses(data);

        if (data.length && !form.classId) {
          setForm((p) => ({ ...p, classId: data[0].id }));
        }
      } catch {
        toast.error("Failed to load classes");
      }
    })();
  }, []);

  /* ---------- Handlers ---------- */

  const updateForm = <K extends keyof ExamForm>(
    key: K,
    value: ExamForm[K]
  ) => {
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

    // hard validation (frontend must protect backend)
    if (form.category === "UNIT_TEST" && !form.sequence) {
      toast.error("Sequence is required for Unit Test");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success("Exam created successfully");
      router.push("/admin/exams");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- UI ---------- */

  return (
    <div className="max-w-3xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>New Exam</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Exam Name */}
              <div>
                <Label>Exam Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  required
                />
              </div>

              {/* Class */}
              <div>
                <Label>Class</Label>
                <Select
                  value={form.classId}
                  onValueChange={(v) => updateForm("classId", v)}
                >
                  <SelectTrigger>
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

              {/* Start Date */}
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    updateForm("startDate", e.target.value)
                  }
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) =>
                    updateForm("endDate", e.target.value)
                  }
                  required
                />
              </div>

              {/* Category */}
              <div>
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={onCategoryChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(ExamCategory).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sequence — ONLY for UNIT_TEST */}
              {form.category === "UNIT_TEST" && (
                <div>
                  <Label>Unit Test Number</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.sequence ?? ""}
                    onChange={(e) =>
                      updateForm("sequence", Number(e.target.value))
                    }
                    required
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Exam"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
