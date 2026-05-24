"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { sidebarItemsByRole, type AppRole, type NavItem } from "@/app/config/sidebarItem";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  Wallet,
  CalendarCheck,
  Megaphone,
  FileText,
  ClipboardList,
  BarChart3,
  TriangleRight,
  Settings,
  LogsIcon,
  UserRoundPen,
  CalendarCheck2,
  Bus,
  Banknote,
  Upload,
  CalendarDays,
  TrendingUp,
  Bell,
  CheckCheck,
  Timer,
  Award,
  CreditCard,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/app/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import { cn } from "../lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface SidebarProps {
  role: AppRole;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const icons: Record<string, React.ComponentType<{ size?: number }>> = {
  dashboard: LayoutDashboard,
  students: Users,
  staff: GraduationCap,
  class: BookOpen,
  fees: Wallet,
  attendance: CalendarCheck,
  announce: Megaphone,
  expense: FileText,
  exams: ClipboardList,
  exam: ClipboardList,
  results: BarChart3,
  settings: Settings,
  logs: LogsIcon,
  user: UserRoundPen,
  subject: TriangleRight,
  DateSheet: CalendarCheck2,
  bus: Bus,
  wallet: Banknote,
  upload: Upload,
  calendar: CalendarDays,
  trending: TrendingUp,
  cron: Timer,
  files: FileText,
  bell: Bell,
  homework: ClipboardList,
  book: BookOpen,
  award: Award,
  "credit-card": CreditCard,
  "file-text": FileText,
};

export function Sidebar({ role, collapsed = false, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const items: NavItem[] = sidebarItemsByRole[role] ?? [];
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: string; title: string; message: string; read: boolean; createdAt: string }[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        if (data.notifications) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    toast.success("All notifications marked as read");
  };

  const markOneRead = async (id: string) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <aside
      className={cn(
        "h-screen flex flex-col border-r bg-gradient-to-b from-white/80 to-white/70 backdrop-blur-lg shadow-lg transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground shadow-md">
         <Link href="/admin/dashboard"><Image className="rounded-full" src="/logo.jpeg" width={40} height={40} alt="Logo" /></Link> 
          </div>
          {!collapsed && (
            <span className="text-lg font-semibold tracking-wide">RGD School</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Notification Bell */}
          <div ref={notifRef} className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative hover:bg-primary/10 hover:text-primary transition-all"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-red-500 rounded-full">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-[100] max-h-96 flex flex-col">
                <div className="flex items-center justify-between p-3 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                      <CheckCheck size={14} /> Mark all read
                    </button>
                  )}
                </div>
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No notifications</p>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => { if (!n.read) markOneRead(n.id); }}
                        className={`px-3 py-2.5 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${!n.read ? "bg-blue-50/50" : ""}`}
                      >
                        <p className={`text-sm ${!n.read ? "font-semibold text-gray-900" : "text-gray-700"}`}>{n.title}</p>
                        <p className="text-xs text-gray-500 truncate">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{format(new Date(n.createdAt), "MMM dd, h:mm a")}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapsed}
            className="hover:bg-primary/10 hover:text-primary transition-all"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-2">
          {items.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = icons[item.icon as keyof typeof icons];

            const linkContent = (
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary/20 text-primary shadow-inner"
                    : "hover:bg-primary/10 hover:text-primary text-muted-foreground"
                )}
              >
                {Icon && <Icon size={18} />}
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>
            );

            return (
              <motion.li
                key={item.href}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="rounded-md"
              >
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link href={item.href}>{linkContent}</Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-gray-800 text-white rounded-md px-2 py-1 text-xs shadow-md">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Link href={item.href}>{linkContent}</Link>
                )}
              </motion.li>
            );
          })}
        </ul>
      </nav>

      <div
        className={cn(
          "p-4 text-xs font-medium border-t border-gray-200 text-muted-foreground",
          collapsed ? "text-center" : "text-left"
        )}
      >
        {!collapsed ? (
          <span>
            © 2025 RGD School —{" "}
            <a
              href="https://github.com/VishalDevx"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary transition-colors"
            >
              Built by Vishal
            </a>
          </span>
        ) : (
          "©"
        )}
      </div>
    </aside>
  );
}
