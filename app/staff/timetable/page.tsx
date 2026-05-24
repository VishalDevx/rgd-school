"use client";

import { useEffect, useState } from "react";
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
import { CalendarDays, BookOpen } from "lucide-react";

interface TimetableEntry {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  subject: { name: string; code: string };
  class: { name: string };
}

interface ClassData {
  id: string;
  name: string;
  grade: string;
  section: string | null;
}

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export default function StaffTimetablePage() {
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");

  useEffect(() => {
    async function init() {
      try {
        const dashRes = await fetch("/api/staff/dashboard");
        if (dashRes.ok) {
          const dashData = await dashRes.json();
          setClasses(dashData.classes || []);
        }
      } catch (error) {
        console.error("Error fetching staff data:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (classes.length === 0) return;
    async function fetchTimetables() {
      try {
        const classIds = selectedClassId === "all"
          ? classes.map((c) => c.id)
          : [selectedClassId];

        const allEntries: TimetableEntry[] = [];
        for (const classId of classIds) {
          const ttRes = await fetch(`/api/timetable?classId=${classId}`);
          if (ttRes.ok) {
            const ttData = await ttRes.json();
            const data = (ttData.data || []).map((e: TimetableEntry) => ({
              ...e,
              class: classes.find((c) => c.id === classId) || { id: "", name: "", grade: "", section: null },
            }));
            allEntries.push(...data);
          }
        }
        setEntries(allEntries);
      } catch (error) {
        console.error("Error fetching timetables:", error);
      }
    }
    fetchTimetables();
  }, [classes, selectedClassId]);

  const allTimeSlots = [...new Set(entries.map((e) => `${e.startTime}-${e.endTime}`))].sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No classes assigned to you</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Timetable</h1>
          <p className="text-gray-500 mt-1">Weekly schedule for your classes</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label>Filter by Class:</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
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

      {entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No timetable available for the selected class</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <div className="min-w-[800px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border p-3 bg-gray-50 text-left text-sm font-semibold text-gray-700 w-24">Time</th>
                    {DAYS.map((day) => (
                      <th key={day.value} className="border p-3 bg-gray-50 text-center text-sm font-semibold text-gray-700">
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allTimeSlots.map((slot) => {
                    const [start, end] = slot.split("-");
                    return (
                      <tr key={slot}>
                        <td className="border p-2 text-xs text-gray-500 font-medium">
                          {formatTime(start)} - {formatTime(end)}
                        </td>
                        {DAYS.map((day) => {
                          const cellEntries = entries.filter(
                            (e) => e.dayOfWeek === day.value && e.startTime === start && e.endTime === end
                          );
                          return (
                            <td key={day.value} className="border p-1.5 align-top h-24">
                              {cellEntries.length > 0 ? cellEntries.map((entry) => (
                                <div
                                  key={entry.id}
                                  className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 mb-1"
                                >
                                  <div className="font-semibold text-indigo-800 text-sm">
                                    {entry.subject.name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    {entry.class?.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {entry.subject.code}
                                  </div>
                                  {entry.room && (
                                    <Badge variant="outline" className="mt-1 text-[10px] px-1 py-0">
                                      Room {entry.room}
                                    </Badge>
                                  )}
                                </div>
                              )) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatTime(time: string) {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}
