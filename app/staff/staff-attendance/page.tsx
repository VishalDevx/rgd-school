"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Loader2, CalendarCheck } from "lucide-react";

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
}

export default function StaffViewAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    async function fetchAttendance() {
      try {
        const params = selectedDate ? `?date=${selectedDate}` : "";
        const res = await fetch(`/api/staff-attendance${params}`);
        const json = await res.json();
        if (json.success) {
          setRecords(json.data || []);
        }
      } catch {
        console.error("Failed to load attendance");
      } finally {
        setLoading(false);
      }
    }
    fetchAttendance();
  }, [selectedDate]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      PRESENT: "bg-green-100 text-green-700",
      ABSENT: "bg-red-100 text-red-700",
      LATE: "bg-yellow-100 text-yellow-700",
      LEAVE: "bg-blue-100 text-blue-700",
      HALF_DAY: "bg-orange-100 text-orange-700",
    };
    return (
      <Badge className={colors[status] || "bg-gray-100 text-gray-700"}>
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <p className="text-gray-500 mt-1">View your attendance records</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Label>Filter by Date:</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attendance Records ({records.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {records.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CalendarCheck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No attendance records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">
                        {new Date(r.date).toLocaleDateString("en-IN", {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(r.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
