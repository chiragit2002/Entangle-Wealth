import { useState, useCallback, useEffect, useMemo, DragEvent } from "react";
import { useAuth } from "@clerk/react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { authFetch } from "@/lib/authFetch";
import {
  type QueueItem,
  getQueueFromStorage,
  saveQueueToStorage,
  PLATFORM_COLORS,
  BEST_TIMES,
} from "@/lib/marketingQueue";
import {
  Shield,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Download,
  Check,
  Archive,
  Megaphone,
  FileText,
  Clock,
  Info,
  X,
  MessageSquare,
  Facebook,
  Instagram,
  Github,
  Mail,
  Users,
  Twitter,
  Linkedin,
  GripVertical,
  CalendarDays,
} from "lucide-react";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  reddit: <MessageSquare className="w-3 h-3" />,
  facebook: <Facebook className="w-3 h-3" />,
  instagram: <Instagram className="w-3 h-3" />,
  twitter: <Twitter className="w-3 h-3" />,
  linkedin: <Linkedin className="w-3 h-3" />,
  github: <Github className="w-3 h-3" />,
  blog: <FileText className="w-3 h-3" />,
  email: <Mail className="w-3 h-3" />,
  community: <Users className="w-3 h-3" />,
};

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7;
  const days: { date: Date; key: string; inMonth: boolean }[] = [];

  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, key: toDateKey(d), inMonth: false });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dt = new Date(year, month, d);
    days.push({ date: dt, key: toDateKey(dt), inMonth: true });
  }

  while (days.length % 7 !== 0) {
    const d = new Date(year, month + 1, days.length - lastDay.getDate() - startDow + 1);
    days.push({ date: d, key: toDateKey(d), inMonth: false });
  }

  return days;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-yellow-500/20 text-yellow-400 border-yellow-500/20",
  approved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
  posted: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  archived: "bg-white/10 text-white/40 border-white/10",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function CalendarGrid({
  year,
  month,
  queue,
  selectedDate,
  onSelectDate,
  onDrop,
}: {
  year: number;
  month: number;
  queue: QueueItem[];
  selectedDate: string | null;
  onSelectDate: (key: string) => void;
  onDrop: (itemId: string, dateKey: string) => void;
}) {
  const days = useMemo(() => getMonthDays(year, month), [year, month]);
  const todayKey = toDateKey(new Date());

  const itemsByDate = useMemo(() => {
    const map: Record<string, QueueItem[]> = {};
    for (const item of queue) {
      if (item.scheduledDate) {
        if (!map[item.scheduledDate]) map[item.scheduledDate] = [];
        map[item.scheduledDate].push(item);
      }
    }
    return map;
  }, [queue]);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: DragEvent, dateKey: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    if (itemId) onDrop(itemId, dateKey);
  };

  const handleDragStart = (e: DragEvent, itemId: string) => {
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: "rgba(8,8,20,0.6)" }}>
      <div className="grid grid-cols-7 border-b border-white/[0.06]">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center py-2 border-r border-white/[0.03] last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const items = itemsByDate[day.key] || [];
          const isToday = day.key === todayKey;
          const isSelected = day.key === selectedDate;

          return (
            <div
              key={day.key}
              onClick={() => onSelectDate(day.key)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, day.key)}
              className={`min-h-[80px] md:min-h-[100px] p-1 border-r border-b border-white/[0.03] last:border-r-0 cursor-pointer transition-colors ${
                !day.inMonth ? "opacity-30" : ""
              } ${isSelected ? "bg-primary/[0.06]" : "hover:bg-white/[0.02]"}`}
            >
              <div className={`text-[11px] font-mono mb-1 px-1 ${
                isToday ? "text-primary font-bold" : "text-white/60"
              }`}>
                {day.date.getDate()}
                {isToday && <span className="ml-1 text-[8px] text-primary">TODAY</span>}
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] truncate cursor-grab active:cursor-grabbing hover:brightness-125 transition-all"
                    style={{
                      backgroundColor: `${PLATFORM_COLORS[item.platform] || "#666"}20`,
                      color: PLATFORM_COLORS[item.platform] || "#999",
                      border: `1px solid ${PLATFORM_COLORS[item.platform] || "#666"}30`,
                    }}
                    title={`${item.platformName}: ${item.topic}`}
                  >
                    <GripVertical className="w-2 h-2 opacity-50 shrink-0" />
                    {PLATFORM_ICONS[item.platform]}
                    <span className="truncate">{item.topic || item.platformName}</span>
                  </div>
                ))}
                {items.length > 3 && (
                  <div className="text-[8px] text-muted-foreground px-1">+{items.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DailyChecklist({
  dateKey,
  items,
  onUpdateStatus,
  onClose,
}: {
  dateKey: string;
  items: QueueItem[];
  onUpdateStatus: (id: string, status: QueueItem["status"]) => void;
  onClose: () => void;
}) {
  const date = new Date(dateKey + "T12:00:00");
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const formatted = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: "rgba(8,8,20,0.6)" }}>
      <div className="flex items-center justify-between p-3 border-b border-white/[0.04]">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            {dayName}
          </h3>
          <p className="text-[10px] text-muted-foreground">{formatted}</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="p-6 text-center text-muted-foreground">
          <Calendar className="w-6 h-6 mx-auto mb-2 opacity-30" />
          <p className="text-xs">No content scheduled for this day</p>
          <p className="text-[10px] mt-1">Drag content from the calendar or schedule from Marketing AI</p>
        </div>
      ) : (
        <div className="p-2 space-y-2">
          {items.map((item) => {
            const bestTime = BEST_TIMES[item.platform];
            return (
              <div key={item.id} className="rounded-lg border border-white/[0.06] p-3 space-y-2" style={{ background: "rgba(0,0,0,0.3)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span style={{ color: PLATFORM_COLORS[item.platform] }}>{PLATFORM_ICONS[item.platform]}</span>
                    <span className="text-xs font-medium text-white">{item.platformName}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${STATUS_COLORS[item.status]}`}>
                      {item.status}
                    </span>
                  </div>
                  {bestTime && (
                    <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      Best: {bestTime.time} {bestTime.timezone}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/60 truncate">{item.topic}</p>
                <div className="bg-white/[0.02] border border-white/[0.04] rounded p-2 max-h-24 overflow-y-auto">
                  <pre className="text-[10px] text-white/70 whitespace-pre-wrap font-sans leading-relaxed">{item.content}</pre>
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.status !== "approved" && (
                    <Button size="sm" className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20 text-[9px] h-6 px-2" onClick={() => onUpdateStatus(item.id, "approved")}>
                      <Check className="w-2.5 h-2.5 mr-1" /> Approve
                    </Button>
                  )}
                  {item.status !== "posted" && (
                    <Button size="sm" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/20 text-[9px] h-6 px-2" onClick={() => onUpdateStatus(item.id, "posted")}>
                      <Megaphone className="w-2.5 h-2.5 mr-1" /> Posted
                    </Button>
                  )}
                  {item.status !== "archived" && (
                    <Button size="sm" className="bg-white/5 text-white/40 hover:bg-white/10 border border-white/10 text-[9px] h-6 px-2" onClick={() => onUpdateStatus(item.id, "archived")}>
                      <Archive className="w-2.5 h-2.5 mr-1" /> Archive
                    </Button>
                  )}
                  {item.status !== "draft" && (
                    <Button size="sm" className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/20 text-[9px] h-6 px-2" onClick={() => onUpdateStatus(item.id, "draft")}>
                      <FileText className="w-2.5 h-2.5 mr-1" /> Draft
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="p-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-1.5 mb-2">
          <Info className="w-3 h-3 text-primary" />
          <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wider">Best Times to Post</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {Object.entries(BEST_TIMES).map(([platform, info]) => (
            <div key={platform} className="flex items-center gap-1 text-[8px] text-muted-foreground">
              <span style={{ color: PLATFORM_COLORS[platform] }}>{PLATFORM_ICONS[platform]}</span>
              <span>{info.days} {info.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BestTimesPanel() {
  return (
    <div className="rounded-xl border border-white/[0.06] p-4" style={{ background: "rgba(8,8,20,0.6)" }}>
      <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        Best Times to Post
      </h3>
      <div className="space-y-2">
        {Object.entries(BEST_TIMES).map(([platform, info]) => {
          const platformName = platform === "twitter" ? "Twitter/X" : platform === "blog" ? "Blog/SEO" : platform === "email" ? "Newsletter" : platform.charAt(0).toUpperCase() + platform.slice(1);
          return (
            <div key={platform} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
              <div className="flex items-center gap-2">
                <span style={{ color: PLATFORM_COLORS[platform] }}>{PLATFORM_ICONS[platform]}</span>
                <span className="text-xs text-white/80">{platformName}</span>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {info.days} {info.time} {info.timezone}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function escapeCsvField(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

const BEST_TIME_DEFAULTS: Record<string, string> = {
  reddit: "09:00",
  facebook: "13:00",
  instagram: "10:00",
  twitter: "12:00",
  linkedin: "08:00",
  github: "10:00",
  blog: "09:00",
  email: "06:00",
  community: "09:00",
};

function ExportModal({
  queue,
  onClose,
}: {
  queue: QueueItem[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [exportStatus, setExportStatus] = useState<QueueItem["status"] | "all">("all");
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");

  const filteredForExport = useMemo(() => {
    let items = queue.filter((q) => q.scheduledDate);
    if (exportStatus !== "all") items = items.filter((q) => q.status === exportStatus);
    if (exportFrom) items = items.filter((q) => (q.scheduledDate || "") >= exportFrom);
    if (exportTo) items = items.filter((q) => (q.scheduledDate || "") <= exportTo);
    return items.sort((a, b) => (a.scheduledDate || "").localeCompare(b.scheduledDate || ""));
  }, [queue, exportStatus, exportFrom, exportTo]);

  const doExport = () => {
    if (filteredForExport.length === 0) {
      toast({ title: "Nothing to export", description: "No content matches your filters", variant: "destructive" });
      return;
    }
    const rows = [
      ["Date", "Time", "Platform", "Content", "Status"].join(","),
      ...filteredForExport.map((item) => {
        const time = BEST_TIME_DEFAULTS[item.platform] || "09:00";
        return [
          item.scheduledDate || "",
          time,
          escapeCsvField(item.platformName),
          escapeCsvField(item.content),
          item.status.charAt(0).toUpperCase() + item.status.slice(1),
        ].join(",");
      }),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `entangle-content-${toDateKey(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${filteredForExport.length} items exported to CSV` });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 " onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-white/[0.08] p-5 space-y-4"
        style={{ background: "rgba(8,8,20,0.98)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" /> Export to CSV
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-white"><X className="w-4 h-4" /></button>
        </div>

        <div>
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Filter by Status</label>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "draft", "approved", "posted", "archived"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setExportStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  exportStatus === s
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-white/[0.03] text-white/50 border border-white/[0.06] hover:bg-white/[0.06]"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">From Date</label>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/40"
            />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">To Date</label>
            <input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/40"
            />
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground">
          {filteredForExport.length} item{filteredForExport.length !== 1 ? "s" : ""} match your filters. Time defaults to each platform's best posting time (HH:MM format).
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="border-white/10 text-xs flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20 text-xs flex-1 gap-1.5"
            onClick={doExport}
            disabled={filteredForExport.length === 0}
          >
            <Download className="w-3.5 h-3.5" /> Export {filteredForExport.length} Items
          </Button>
        </div>

        <p className="text-[9px] text-muted-foreground">
          CSV format: Date, Time, Platform, Content, Status | compatible with Buffer, Hootsuite, and Later.
        </p>
      </div>
    </div>
  );
}

export default function ContentCalendar() {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const checkAccess = useCallback(async () => {
    try {
      const res = await authFetch("/marketing/agents", getToken);
      if (res.ok) setAuthorized(true);
    } catch (err) {
      console.error("[ContentCalendar] Failed to check access:", err);
    }
    setLoading(false);
  }, [getToken]);

  useEffect(() => {
    checkAccess();
    setQueue(getQueueFromStorage());
  }, [checkAccess]);

  const updateQueue = (updated: QueueItem[]) => {
    setQueue(updated);
    saveQueueToStorage(updated);
  };

  const updateStatus = (id: string, status: QueueItem["status"]) => {
    updateQueue(queue.map((q) => (q.id === id ? { ...q, status } : q)));
  };

  const handleDrop = (itemId: string, dateKey: string) => {
    updateQueue(queue.map((q) => (q.id === itemId ? { ...q, scheduledDate: dateKey } : q)));
    toast({ title: "Rescheduled", description: `Content moved to ${dateKey}` });
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const goToday = () => {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(toDateKey(now));
  };

  const selectedItems = useMemo(() => {
    if (!selectedDate) return [];
    return queue.filter((q) => q.scheduledDate === selectedDate);
  }, [queue, selectedDate]);

  const unscheduledItems = useMemo(() => queue.filter((q) => !q.scheduledDate), [queue]);

  const scheduleUnscheduled = (itemId: string) => {
    const today = toDateKey(now);
    updateQueue(queue.map((q) => (q.id === itemId ? { ...q, scheduledDate: today } : q)));
    toast({ title: "Scheduled", description: "Content scheduled for today. Drag to reschedule." });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!authorized) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-32 text-center px-4">
          <div className="w-16 h-16 rounded-sm bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
            <Shield className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-muted-foreground max-w-md">
            The Content Calendar is restricted to admin-tier accounts. Contact the platform administrator for access.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-600/20 flex items-center justify-center border border-primary/20">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              Content Calendar
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Schedule, review, and track content across all platforms</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-white/10 gap-1.5 text-xs" onClick={() => setShowExport(true)}>
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-white" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-lg font-semibold text-white min-w-[180px] text-center">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-white" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="border-white/10 text-xs h-7 ml-2" onClick={goToday}>
              Today
            </Button>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-400" /> Draft
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-400" /> Approved
            </span>
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-400" /> Posted
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <div>
            <CalendarGrid
              year={viewYear}
              month={viewMonth}
              queue={queue}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onDrop={handleDrop}
            />
          </div>

          <div className="space-y-4">
            {selectedDate ? (
              <DailyChecklist
                dateKey={selectedDate}
                items={selectedItems}
                onUpdateStatus={updateStatus}
                onClose={() => setSelectedDate(null)}
              />
            ) : (
              <BestTimesPanel />
            )}

            {unscheduledItems.length > 0 && (
              <div className="rounded-xl border border-white/[0.06] overflow-hidden" style={{ background: "rgba(8,8,20,0.6)" }}>
                <div className="p-3 border-b border-white/[0.04]">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-yellow-400" />
                    Unscheduled ({unscheduledItems.length})
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Click to schedule for today, then drag to reschedule</p>
                </div>
                <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                  {unscheduledItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scheduleUnscheduled(item.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white/[0.04] transition-colors"
                    >
                      <span style={{ color: PLATFORM_COLORS[item.platform] }}>{PLATFORM_ICONS[item.platform]}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-white/80 truncate">{item.topic || item.platformName}</p>
                        <p className="text-[9px] text-muted-foreground">{item.platformName} - {item.tone}</p>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${STATUS_COLORS[item.status]}`}>
                        {item.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
          <p className="text-xs text-yellow-400/80 flex items-center gap-2">
            <Shield className="w-4 h-4 shrink-0" />
            Content is for manual posting only. Drag items between days to reschedule. Export to CSV for use with Buffer, Hootsuite, or Later.
          </p>
        </div>
      </div>

      {showExport && <ExportModal queue={queue} onClose={() => setShowExport(false)} />}
    </Layout>
  );
}
