"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  ClipboardList,
  Plus,
  BookOpen,
  Calendar,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Label } from "@/app/components/ui/label";

interface Exam {
  id: string;
  name: string;
  category: string;
  sequence: number | null;
  isLocked: boolean;
  startDate: string;
  endDate: string;
  class?: {
    id: string;
    name: string;
  };
}

interface Class {
  id: string;
  name: string;
  grade: string;
  section: string | null;
}

export default function StaffExamsPage() {
  const { data: session } = useSession();
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch classes
        const classesRes = await fetch("/api/staff/dashboard");
        if (classesRes.ok) {
          const dashboardData = await classesRes.json();
          setClasses(dashboardData.classes || []);
        }

        // Fetch exams
        await fetchExams();
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const fetchExams = async () => {
    try {
      const url =
        selectedClassId === "all"
          ? "/api/exams"
          : `/api/exams?classId=${selectedClassId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setExams(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching exams:", error);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchExams();
    }
  }, [selectedClassId]);

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "UNIT_TEST":
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            Unit Test
          </Badge>
        );
      case "HALF_YEARLY":
        return (
          <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
            Half Yearly
          </Badge>
        );
      case "ANNUAL":
        return (
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
            Annual
          </Badge>
        );
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const startDate = new Date(exam.startDate);
    const endDate = new Date(exam.endDate);

    if (now < startDate) {
      return { status: "upcoming", label: "Upcoming", color: "text-blue-600" };
    } else if (now >= startDate && now <= endDate) {
      return { status: "ongoing", label: "Ongoing", color: "text-orange-600" };
    } else {
      return { status: "completed", label: "Completed", color: "text-green-600" };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredExams = exams;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exams Management</h1>
          <p className="text-gray-500 mt-1">Create and manage exams for your classes</p>
        </div>
        <div className="flex items-center gap-2">
          {classes.length > 0 && (
            <Link href="/staff/results/new">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Results
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Filter */}
      {classes.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label>Filter by Class:</Label>
              <Select
                value={selectedClassId}
                onValueChange={setSelectedClassId}
              >
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Exams
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exams.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Upcoming
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                exams.filter(
                  (e) => new Date(e.startDate) > new Date()
                ).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ongoing
            </CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                exams.filter(
                  (e) =>
                    new Date(e.startDate) <= new Date() &&
                    new Date(e.endDate) >= new Date()
                ).length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Completed
            </CardTitle>
            <BookOpen className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                exams.filter((e) => new Date(e.endDate) < new Date())
                  .length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exams List */}
      {filteredExams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExams.map((exam) => {
            const examStatus = getExamStatus(exam);
            return (
              <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{exam.name}</CardTitle>
                        {getCategoryBadge(exam.category)}
                        {exam.isLocked && (
                          <span className="text-xs text-gray-400 ml-1">(Locked)</span>
                        )}
                      </div>
                      {exam.sequence && (
                        <p className="text-sm text-gray-500">
                          Sequence: {exam.sequence}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={examStatus.color}>
                      {examStatus.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(exam.startDate), "MMM dd, yyyy")} -{" "}
                        {format(new Date(exam.endDate), "MMM dd, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 pt-3 border-t">
                      <Link href={`/staff/results?examId=${exam.id}`}>
                        <Button variant="outline" size="sm">
                          <BookOpen className="h-3 w-3 mr-1" />
                          Add Results
                        </Button>
                      </Link>
                      <Link href={`/staff/results?examId=${exam.id}`}>
                        <Button variant="outline" size="sm">
                          <BookOpen className="h-3 w-3 mr-1" />
                          Results
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">
              {selectedClassId === "all"
                ? "No exams found"
                : "No exams for this class"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

