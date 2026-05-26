"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  GraduationCap,
  BookOpen,
  Hash,
  UserCircle,
  Edit,
} from "lucide-react";
import Image from "next/image";
import { PDFDownloadButton } from "@/app/components/PDFDownloadButton";
import { usePDF } from "@/app/lib/usePDF";
import { StudentProfilePDF, AdmissionFormPDF } from "@/app/components/PDFTemplates";

interface StudentProfile {
  id: string;
  admissionNo: string;
  rollNumber: string;
  admissionDate: string;
  dob: string | null;
  gender: string | null;
  address: string | null;
  profileImg: string | null;
  fatherName: string | null;
  motherName: string | null;
  panNo: string | null;
  apaarId: string | null;
  fatherAadhar: string | null;
  motherAadhar: string | null;
  occupation: string;
  religion: string;
  caste: string;
  udiseCode: string | null;
  contactNo: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    adharNo: string;
    image: string | null;
    createdAt: string;
  };
  class: {
    id: string;
    name: string;
    grade: string;
    section: string | null;
    academicSession: {
      id: string;
      name: string;
      isActive: boolean;
    };
    teacher: {
      user: {
        name: string;
        email: string;
        phone: string | null;
      };
    } | null;
    subjects: {
      id: string;
      name: string;
      code: string;
      teacher: {
        user: {
          name: string;
        };
      } | null;
    }[];
  } | null;
}

interface ProfileData {
  student: StudentProfile;
}

export default function StudentProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const profilePdf = usePDF(`${data?.student?.user?.name ?? "Student"}_Profile.pdf`);
  const admissionPdf = usePDF(`${data?.student?.user?.name ?? "Student"}_Admission_Form.pdf`);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/student/profile");
        if (res.ok) {
          const profileData = await res.json();
          setData(profileData);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Failed to load profile data</p>
      </div>
    );
  }

  const { student } = data;
  const profileImage = student.profileImg || student.user.image || "/logo.jpeg";
  const studentData: Record<string, string | null | undefined> = {
    name: student.user.name, admissionNo: student.admissionNo,
    rollNumber: student.rollNumber, className: student.class?.name,
    fatherName: student.fatherName, motherName: student.motherName,
    dob: student.dob ? format(new Date(student.dob), "MMM dd, yyyy") : null,
    gender: student.gender, bloodGroup: null, category: null,
    email: student.user.email, phone: student.user.phone,
    address: student.address, guardianPhone: student.contactNo,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">View and manage your profile information</p>
        </div>
        <div className="flex gap-2">
          <PDFDownloadButton onClick={profilePdf.generatePDF} loading={profilePdf.loading} label="Download Profile" variant="outline" />
          <PDFDownloadButton onClick={admissionPdf.generatePDF} loading={admissionPdf.loading} label="Admission Form" variant="outline" />
        </div>
      </div>

      {/* Hidden PDF content */}
      <div className="hidden"><div ref={profilePdf.ref}><StudentProfilePDF student={studentData} /></div></div>
      <div className="hidden"><div ref={admissionPdf.ref}><AdmissionFormPDF student={studentData} /></div></div>

      {/* Profile Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                <Image
                  src={profileImage}
                  alt={student.user.name}
                  width={128}
                  height={128}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 border-4 border-white">
                <UserCircle className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{student.user.name}</h2>
              <p className="text-gray-600 mt-1">{student.user.email}</p>
              {student.class && (
                <div className="flex items-center gap-4 mt-3">
                  <Badge className="bg-blue-100 text-blue-700">
                    {student.class.name}
                  </Badge>
                  <span className="text-sm text-gray-500">
                    Roll No: {student.rollNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                  <Hash className="h-4 w-4" />
                  Admission Number
                </label>
                <p className="text-gray-900 font-semibold">{student.admissionNo}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                  <Hash className="h-4 w-4" />
                  Roll Number
                </label>
                <p className="text-gray-900 font-semibold">{student.rollNumber}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <p className="text-gray-900">{student.user.email}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                  <Phone className="h-4 w-4" />
                  Phone
                </label>
                <p className="text-gray-900">
                  {student.user.phone || student.contactNo || "Not provided"}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                  <Hash className="h-4 w-4" />
                  Aadhar Number
                </label>
                <p className="text-gray-900">{student.user.adharNo}</p>
              </div>

              {student.dob && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4" />
                    Date of Birth
                  </label>
                  <p className="text-gray-900">
                    {format(new Date(student.dob), "MMM dd, yyyy")}
                  </p>
                </div>
              )}

              {student.gender && (
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                    <User className="h-4 w-4" />
                    Gender
                  </label>
                  <p className="text-gray-900">{student.gender}</p>
                </div>
              )}

              {student.address && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                    <MapPin className="h-4 w-4" />
                    Address
                  </label>
                  <p className="text-gray-900">{student.address}</p>
                </div>
              )}

              {student.fatherName && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-1">
                    Father&apos;s Name
                  </label>
                  <p className="text-gray-900">{student.fatherName}</p>
                </div>
              )}

              {student.motherName && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-1">
                    Mother&apos;s Name
                  </label>
                  <p className="text-gray-900">{student.motherName}</p>
                </div>
              )}

              {student.fatherAadhar && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-1">
                    Father&apos;s Aadhar
                  </label>
                  <p className="text-gray-900">{student.fatherAadhar}</p>
                </div>
              )}

              {student.motherAadhar && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-1">
                    Mother&apos;s Aadhar
                  </label>
                  <p className="text-gray-900">{student.motherAadhar}</p>
                </div>
              )}

              {student.panNo && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-1">
                    Pan No
                  </label>
                  <p className="text-gray-900">{student.panNo}</p>
                </div>
              )}

              {student.apaarId && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-1">
                    APAAR ID
                  </label>
                  <p className="text-gray-900">{student.apaarId}</p>
                </div>
              )}

              {student.occupation && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-1">
                    Occupation
                  </label>
                  <p className="text-gray-900">{student.occupation}</p>
                </div>
              )}

              {student.religion && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-1">
                    Religion
                  </label>
                  <p className="text-gray-900">{student.religion}</p>
                </div>
              )}

              {student.caste && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-1">
                    Caste
                  </label>
                  <p className="text-gray-900">{student.caste}</p>
                </div>
              )}

              {student.udiseCode && (
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-1">
                    UDISE Code
                  </label>
                  <p className="text-gray-900">{student.udiseCode}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4" />
                  Admission Date
                </label>
                <p className="text-gray-900">
                  {format(new Date(student.admissionDate), "MMM dd, yyyy")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {student.class ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 mb-1">
                    Class
                  </label>
                  <p className="text-gray-900 font-semibold">{student.class.name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 mb-1">
                    Academic Session
                  </label>
                  <p className="text-gray-900">{student.class.academicSession.name}</p>
                  {student.class.academicSession.isActive && (
                    <Badge className="bg-green-100 text-green-700 mt-1">
                      Active
                    </Badge>
                  )}
                </div>

                {student.class.teacher && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-1">
                      Class Teacher
                    </label>
                    <p className="text-gray-900">{student.class.teacher.user.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {student.class.teacher.user.email}
                    </p>
                    {student.class.teacher.user.phone && (
                      <p className="text-xs text-gray-500">
                        {student.class.teacher.user.phone}
                      </p>
                    )}
                  </div>
                )}

                {student.class.subjects.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Subjects ({student.class.subjects.length})
                    </label>
                    <div className="space-y-2">
                      {student.class.subjects.map((subject) => (
                        <div
                          key={subject.id}
                          className="p-2 bg-gray-50 rounded text-sm"
                        >
                          <p className="font-medium text-gray-900">{subject.name}</p>
                          <p className="text-xs text-gray-500">{subject.code}</p>
                          {subject.teacher && (
                            <p className="text-xs text-gray-400 mt-1">
                              {subject.teacher.user.name}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No class assigned</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
