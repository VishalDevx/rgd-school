"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Label } from "@/app/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";

interface ClassItem {
  id: string;
  name: string;
  grade: string;
}

interface ApiResponse {
  data: ClassItem[];
}

interface FormState {
  name: string;
  email: string;
  adharNo: string;
  admissionNo: string;
  rollNumber: string;
  classId: string;
  dob: string;
  gender: string;
  address: string;
  caste: string;
  religion: string;
  occupation: string;
  fatherName: string;
  motherName: string;
  udiseCode: string;
  panNo: string;
  apaarId: string;
  fatherAadhar: string;
  motherAadhar: string;
  contactNo: string;
  usesTransport: string;
}

export default function NewStudentPage() {
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    adharNo: "",
    admissionNo: "",
    rollNumber: "",
    classId: "",
    dob: "",
    gender: "",
    address: "",
    caste: "",
    religion: "",
    occupation: "",
    fatherName: "",
    motherName: "",
    udiseCode: "",
    panNo: "",
    apaarId: "",
    fatherAadhar: "",
    motherAadhar: "",
    contactNo: "",
    usesTransport: "no",
  });

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await fetch("/api/classes");
        if (!res.ok) throw new Error("Failed fetching classes");

        const json: ApiResponse = await res.json();
        console.log("API:", json);

        const list = json?.data ?? [];
        setClasses(list);
      } catch (err) {
        console.error(err);
        setError("Unable to load classes");
      }
    };

    loadClasses();
  }, []);

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      if (file) formData.append("file", file);

      const res = await fetch("/api/students", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create student");
      }

      router.push("/admin/students");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto mt-10">
      <CardHeader>
        <CardTitle>Add New Student</CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* BASIC INPUTS */}
            {(
              [
                ["Full Name", "name"],
                ["Email", "email"],
                ["Aadhar No", "adharNo"],
                ["Admission No", "admissionNo"],
                ["Roll Number", "rollNumber"],
                ["Father Name", "fatherName"],
                ["Mother Name", "motherName"],
                ["UDISE Code", "udiseCode"],
                ["Pan No", "panNo"],
                ["APAAR ID", "apaarId"],
                ["Father Aadhar", "fatherAadhar"],
                ["Mother Aadhar", "motherAadhar"],
                ["Religion", "religion"],
                ["Caste", "caste"],
                ["Contact No", "contactNo"],
                ["Occupation", "occupation"],
              ] as Array<[string, keyof FormState]>
            ).map(([label, key]) => (
              <div key={key}>
                <Label>{label}</Label>
                <Input
                  value={form[key]}
                  onChange={(e) => onChange(key, e.target.value)}
                  required
                />
              </div>
            ))}

            {/* CLASS DROPDOWN */}
            <div>
              <Label>Class</Label>
              <Select
                onValueChange={(v) => onChange("classId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>

                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} ({c.grade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* DOB */}
            <div>
              <Label>DOB</Label>
              <Input
                type="date"
                value={form.dob}
                onChange={(e) => onChange("dob", e.target.value)}
              />
            </div>

            {/* GENDER */}
            <div>
              <Label>Gender</Label>
              <Select
                onValueChange={(v) => onChange("gender", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ADDRESS */}
            <div className="md:col-span-2">
              <Label>Address</Label>
              <Textarea
                value={form.address}
                onChange={(e) => onChange("address", e.target.value)}
              />
            </div>

            {/* USES TRANSPORT */}
            <div>
              <Label>Uses Transport</Label>
              <Select
                value={form.usesTransport}
                onValueChange={(v) => onChange("usesTransport", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* IMAGE */}
          <div>
            <Label>Profile Image</Label>
            <div className="flex items-center gap-4 mt-2">
              {preview ? (
                <Image
                  src={preview}
                  alt="Preview"
                  width={80}
                  height={80}
                  className="rounded-full object-cover border"
                />
              ) : (
                <div className="w-20 h-20 rounded-full border border-dashed flex items-center justify-center text-sm text-muted-foreground">
                  No Image
                </div>
              )}

              <Input type="file" accept="image/*" onChange={handleFileChange} />
            </div>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex justify-end gap-4">
            <Button variant="outline" type="button" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Student"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
