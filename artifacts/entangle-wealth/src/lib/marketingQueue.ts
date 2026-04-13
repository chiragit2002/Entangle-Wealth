export interface QueueItem {
  id: string;
  platform: string;
  platformName: string;
  content: string;
  tone: string;
  status: "draft" | "approved" | "posted" | "archived";
  createdAt: string;
  topic: string;
  scheduledDate?: string;
}

const STORAGE_KEY = "entangle_marketing_queue";

export function getQueueFromStorage(): QueueItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveQueueToStorage(queue: QueueItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export const PLATFORM_COLORS: Record<string, string> = {
  reddit: "#FF4500",
  facebook: "#1877F2",
  instagram: "#E4405F",
  twitter: "#1DA1F2",
  linkedin: "#0A66C2",
  github: "#8B5CF6",
  blog: "#00D4FF",
  email: "#FFB800",
  community: "#00FF41",
};

export const BEST_TIMES: Record<string, { days: string; time: string; timezone: string }> = {
  reddit: { days: "Tue-Thu", time: "8-10 AM", timezone: "EST" },
  facebook: { days: "Wed-Fri", time: "1-4 PM", timezone: "EST" },
  instagram: { days: "Tue-Wed", time: "10 AM-1 PM", timezone: "EST" },
  twitter: { days: "Mon-Fri", time: "12-3 PM", timezone: "EST" },
  linkedin: { days: "Tue-Wed", time: "8-10 AM", timezone: "EST" },
  github: { days: "Mon-Fri", time: "10 AM-12 PM", timezone: "EST" },
  blog: { days: "Mon-Wed", time: "9-11 AM", timezone: "EST" },
  email: { days: "Tue-Thu", time: "6-8 AM", timezone: "EST" },
  community: { days: "Mon-Fri", time: "9 AM-5 PM", timezone: "EST" },
};
