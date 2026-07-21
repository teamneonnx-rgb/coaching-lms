"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  CalendarCheck,
  UserPlus,
  Info,
  CheckCheck,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

type NotificationType = "TEACHER_ATTENDANCE" | "STUDENT_ENROLLMENT" | "SYSTEM_ALERT";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
};

type Payload = { unreadCount: number; notifications: Notification[] };

const ICONS: Record<NotificationType, LucideIcon> = {
  TEACHER_ATTENDANCE: CalendarCheck,
  STUDENT_ENROLLMENT: UserPlus,
  SYSTEM_ALERT: Info,
};

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load notifications");
    return r.json() as Promise<Payload>;
  });

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);

  // Client-side polling (SRD Phase 6) — every 20s, on focus, and in background
  // tabs too (a notification bell should keep counting while backgrounded).
  const { data, mutate } = useSWR<Payload>(
    "/api/admin/notifications?limit=20",
    fetcher,
    { refreshInterval: 20000, refreshWhenHidden: true, revalidateOnFocus: true }
  );

  const unreadCount = data?.unreadCount ?? 0;
  const notifications = data?.notifications ?? [];

  async function handleMarkAll() {
    setMarking(true);
    // Optimistic: clear unread locally, then revalidate.
    await mutate(
      async () => {
        await markAllNotificationsRead();
        return undefined; // force refetch
      },
      {
        optimisticData: {
          unreadCount: 0,
          notifications: notifications.map((n) => ({ ...n, isRead: true })),
        },
        rollbackOnError: true,
        revalidate: true,
      }
    );
    setMarking(false);
  }

  async function handleClickOne(n: Notification) {
    if (n.isRead) return;
    await markNotificationRead({ id: n.id });
    mutate();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-4 text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">Notifications</p>
          {unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="xs"
              onClick={handleMarkAll}
              disabled={marking}
              className="text-blue-600 hover:text-blue-700"
            >
              {marking ? <Loader2 className="size-3 animate-spin" /> : <CheckCheck className="size-3" />}
              Mark all read
            </Button>
          ) : null}
        </div>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <Bell className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <ul className="divide-y divide-slate-100">
              {notifications.map((n) => {
                const Icon = ICONS[n.type] ?? Info;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClickOne(n)}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50",
                        !n.isRead && "bg-blue-50/50"
                      )}
                    >
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-slate-900">{n.title}</span>
                          {!n.isRead ? (
                            <span className="size-2 shrink-0 rounded-full bg-blue-600" />
                          ) : null}
                        </span>
                        <span className="line-clamp-2 text-xs text-muted-foreground">{n.message}</span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
