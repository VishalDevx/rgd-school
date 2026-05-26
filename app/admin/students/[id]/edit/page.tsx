'use client';

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import EditStudentForm from "@/app/components/StudentForm";
 
 export interface NormalizedStudent {
  id: string;
  classId: string;
  admissionNo: string;
  rollNumber: string;
  dob: string | null;
  gender: "MALE" | "FEMALE" | "OTHER";
  address: string | null;
  fatherName: string | null;
  motherName: string | null;
  occupation: string | null;
  religion: string | null;
  caste: string | null;
  udiseCode: string | null;
  panNo: string | null;
  apaarId: string | null;
  fatherAadhar: string | null;
  motherAadhar: string | null;
  contactNo: string | null;
  usesTransport?: boolean;
  user: {
    name: string;
    email: string;
    adharNo: string;
  };
}

export default function EditStudentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<NormalizedStudent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;

    const fetchStudent = async () => {
      try {
        const res = await fetch(`/api/students/${params.id}`);
        if (!res.ok) throw new Error("Failed to fetch student");

        const data = await res.json();

        // ✅ Wrap user info inside `user`
        const normalized: NormalizedStudent = {
          id: data.id,
          classId: data.classId ?? "",
          admissionNo: data.admissionNo,
          rollNumber: data.rollNumber,
          dob: data.dob ? data.dob.split("T")[0] : null,
          gender: data.gender ?? "MALE",
          address: data.address ?? null,
          fatherName: data.fatherName ?? null,
          motherName: data.motherName ?? null,
          occupation: data.occupation ?? null,
          religion: data.religion ?? null,
          caste: data.caste ?? null,
          udiseCode: data.udiseCode ?? null,
          contactNo: data.contactNo ?? null,
          panNo: data.panNo ?? null,
          apaarId: data.apaarId ?? null,
          fatherAadhar: data.fatherAadhar ?? null,
          motherAadhar: data.motherAadhar ?? null,
          usesTransport: data.usesTransport,
          user: {
            name: data.user.name,
            email: data.user.email,
            adharNo: data.user.adharNo,
          },
        };

        setStudent(normalized);
      } catch (err) {
        console.error(err);
        router.push("/admin/students"); // redirect if not found
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [params?.id, router]);

  if (loading) return <div>Loading...</div>;
  if (!student) return <div>Student not found.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Edit Student: {student.user.name}</h1>
      <EditStudentForm student={student} />
    </div>
  );
}
