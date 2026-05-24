"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Loader2, Bell, CheckCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import Pagination from "@/app/components/Pagination";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export default function StaffNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 15;
  const totalPages = Math.ceil(notifications.length / PAGE_SIZE);
  const paginated = notifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All marked as read");
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const markOneRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      toast.error("Failed to mark as read");
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      ANNOUNCEMENT: "bg-blue-100 text-blue-700",
      FEE_REMINDER: "bg-yellow-100 text-yellow-700",
      RESULT_PUBLISHED: "bg-green-100 text-green-700",
      ATTENDANCE_ALERT: "bg-red-100 text-red-700",
      HOMEWORK: "bg-purple-100 text-purple-700",
      GENERAL: "bg-gray-100 text-gray-700",
      CERTIFICATE: "bg-indigo-100 text-indigo-700",
    };
    return colors[type] || "bg-gray-100 text-gray-700";
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {notifications.filter((n) => !n.read).length} unread
          </p>
        </div>
        {notifications.filter((n) => !n.read).length > 0 && (
          <Button variant="outline" onClick={markAllRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500">No notifications</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Notifications</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {paginated.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 flex items-start gap-3 hover:bg-gray-50 cursor-pointer transition-colors ${
                    !n.read ? "bg-blue-50/50" : ""
                  }`}
                  onClick={() => { if (!n.read) markOneRead(n.id); }}
                >
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    n.read ? "bg-transparent" : "bg-blue-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${!n.read ? "text-gray-900" : "text-gray-700"}`}>
                        {n.title}
                      </span>
                      <Badge className={`text-[10px] px-1.5 py-0 ${getTypeColor(n.type)}`}>
                        {n.type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {format(new Date(n.createdAt), "MMM dd, yyyy h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={notifications.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
