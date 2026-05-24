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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Label } from "@/app/components/ui/label";
import { CalendarDays, Clock, BookOpen } from "lucide-react";

interface ExamDateEntry {
  id: string;
  examDate: string;
  startTime: string;
  endTime: string;
  room: string | null;
  subject: { name: string; code: string };
  class?: { name: string };
  exam: { name: string; category: string };
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

interface StudentData {
  id: string;
  class: { id: string; name: string } | null;
}

interface Exam {
  id: string;
  name: string;
  category: string;
  startDate: string;
  endDate: string;
}

export default function StudentDateSheetPage() {
  const [entries, setEntries] = useState<ExamDateEntry[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExamId, setSelectedExamId] = useState<string>("all");

  useEffect(() => {
    async function init() {
      try {
        const dashRes = await fetch("/api/student/dashboard");
        if (dashRes.ok) {
          const dashData = await dashRes.json();
          setStudent(dashData.student);

          if (dashData.student?.class?.id) {
            const [examsRes, dsRes] = await Promise.all([
              fetch(`/api/exams?classId=${dashData.student.class.id}`),
              fetch(`/api/dateSheet?classId=${dashData.student.class.id}`),
            ]);

            if (examsRes.ok) {
              const examsData = await examsRes.json();
              setExams(examsData.data || []);
            }

            if (dsRes.ok) {
              const dsData = await dsRes.json();
              setEntries(dsData.data || []);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const filteredEntries = selectedExamId === "all"
    ? entries
    : entries.filter((e) => e.exam.name === exams.find((x) => x.id === selectedExamId)?.name);

  const groupedByExam = filteredEntries.reduce((acc, entry) => {
    const key = entry.exam.name;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {} as Record<string, ExamDateEntry[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!student?.class) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No class assigned</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Date Sheet</h1>
          <p className="text-gray-500 mt-1">{student.class.name}</p>
        </div>
      </div>

      {exams.length > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Label>Filter by Exam:</Label>
              <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.keys(groupedByExam).length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No exam timetable available</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(groupedByExam).map(([examName, examEntries]) => (
          <Card key={examName}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{examName}</CardTitle>
                <Badge variant="outline">{examEntries[0].exam.category}</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Subject</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Time</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Room</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examEntries
                      .sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime())
                      .map((entry) => (
                        <tr key={entry.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">
                            {format(new Date(entry.examDate), "MMM dd, yyyy")}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-gray-400" />
                              <span>{entry.subject.name}</span>
                              <span className="text-xs text-gray-400">({entry.subject.code})</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Clock className="h-4 w-4" />
                              {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {entry.room ? (
                              <Badge variant="outline">Room {entry.room}</Badge>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
