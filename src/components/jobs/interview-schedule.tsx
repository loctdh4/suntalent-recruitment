"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Briefcase,
  Building2,
  CalendarClock,
  Check,
  Mail,
  MapPin,
  Pencil,
  Phone,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { setInterviewAttended, updateInterviewAt } from "@/lib/applications/actions";
import { AddToCalendar } from "@/components/calendar/add-to-calendar";
import { formatDate, formatTime } from "@/lib/format";

export type InterviewItem = {
  appId: string;
  candidateId: string;
  name: string;
  phone: string | null;
  email: string | null;
  desiredPosition: string | null;
  location: string | null;
  interviewAt: string;
  relDays: number;
  isPast: boolean;
  attended: boolean;
};

/** Nhãn tương đối theo số ngày tới buổi PV. */
export function relBadge(n: number): { text: string; cls: string } {
  if (n < 0)
    return {
      text: "Đã qua",
      cls: "border-transparent bg-slate-200 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
    };
  if (n === 0)
    return {
      text: "Hôm nay",
      cls: "border-transparent bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
    };
  if (n === 1)
    return {
      text: "Ngày mai",
      cls: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    };
  return {
    text: `${n} ngày nữa`,
    cls: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  };
}

export type InterviewJob = {
  title: string;
  clientName: string | null;
  location: string | null;
};

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Briefcase;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

/** ISO → giá trị cho input datetime-local (theo giờ trình duyệt). */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InterviewSchedule({
  interviews,
  job,
  canManage = false,
}: {
  interviews: InterviewItem[];
  job: InterviewJob;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState<InterviewItem | null>(null);
  const [editing, setEditing] = useState<{ appId: string; name: string; value: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function saveEdit() {
    if (!editing) return;
    const { appId, value } = editing;
    startTransition(async () => {
      const res = await updateInterviewAt(
        appId,
        value ? new Date(value).toISOString() : null,
      );
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Đã cập nhật thời gian phỏng vấn");
        setEditing(null);
        router.refresh();
      }
    });
  }

  function toggleAttended(appId: string, attended: boolean) {
    startTransition(async () => {
      const res = await setInterviewAttended(appId, attended);
      if (res?.error) toast.error(res.error);
      else {
        toast.success(attended ? "Đã đánh dấu đã đến PV" : "Đã bỏ đánh dấu");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      {interviews.map((r) => (
        <div
          key={r.appId}
          className="flex flex-col gap-2 rounded-lg border p-3 transition hover:border-primary/50 sm:flex-row sm:items-center sm:gap-3"
        >
          <div className="shrink-0 sm:w-24">
            {r.attended ? (
              <Badge className="border-transparent bg-emerald-100 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                Đã đến PV
              </Badge>
            ) : r.isPast ? (
              <Badge className="border-transparent bg-slate-200 font-medium text-slate-600 dark:bg-slate-500/20 dark:text-slate-300">
                Đã qua
              </Badge>
            ) : (
              <Badge className={cn("font-medium", relBadge(r.relDays).cls)}>
                {relBadge(r.relDays).text}
              </Badge>
            )}
          </div>
          <button
            type="button"
            onClick={() => setActive(r)}
            className="min-w-0 flex-1 cursor-pointer text-left"
          >
            <p className="truncate font-medium">{r.name}</p>
            {r.desiredPosition && (
              <p className="truncate text-xs text-muted-foreground">
                {r.desiredPosition}
              </p>
            )}
            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {r.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3" /> {r.phone}
                </span>
              )}
              {r.email && (
                <span className="flex items-center gap-1">
                  <Mail className="size-3" /> {r.email}
                </span>
              )}
            </div>
          </button>
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400">
              <CalendarClock className="size-4" />
              Vào lúc {formatTime(r.interviewAt)} ngày {formatDate(r.interviewAt)}
            </span>
            <AddToCalendar
              title={`PV: ${r.name} - ${job.title}`}
              startISO={r.interviewAt}
              location={job.location ?? r.location ?? ""}
              description={[
                `Ứng viên: ${r.name}`,
                r.phone ? `SĐT: ${r.phone}` : "",
                r.email ? `Email: ${r.email}` : "",
                `Vị trí: ${job.title}`,
                `Khách hàng: ${job.clientName ?? "—"}`,
              ]
                .filter(Boolean)
                .join("\n")}
            />
            {canManage && r.isPast && (
              <Button
                variant={r.attended ? "ghost" : "outline"}
                size="sm"
                disabled={pending}
                onClick={() => toggleAttended(r.appId, !r.attended)}
                className={
                  r.attended
                    ? "text-emerald-600 dark:text-emerald-400"
                    : ""
                }
              >
                <Check className="size-4" />
                {r.attended ? "Bỏ đánh dấu" : "Đã đến PV"}
              </Button>
            )}
            {canManage && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sửa thời gian phỏng vấn"
                onClick={() =>
                  setEditing({ appId: r.appId, name: r.name, value: toLocalInput(r.interviewAt) })
                }
              >
                <Pencil className="size-4" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {/* Phiếu lịch PV (xem & chụp gửi khách hàng) */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Phiếu lịch phỏng vấn</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div className="rounded-xl border p-4 text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Thời gian phỏng vấn
                </p>
                <p className="mt-1 text-3xl font-bold">
                  {formatTime(active.interviewAt)}
                </p>
                <p className="text-sm font-medium text-muted-foreground">
                  Ngày {formatDate(active.interviewAt)}
                </p>
              </div>

              <div className="space-y-3">
                <Row icon={Briefcase} label="Vị trí phỏng vấn" value={job.title} />
                <Row
                  icon={Building2}
                  label="Khách hàng / đối tác"
                  value={job.clientName ?? "—"}
                />
                {(job.location || active.location) && (
                  <Row
                    icon={MapPin}
                    label="Địa điểm"
                    value={job.location ?? active.location!}
                  />
                )}
                <Row icon={User} label="Ứng viên" value={active.name} />
                {active.phone && (
                  <Row icon={Phone} label="Số điện thoại" value={active.phone} />
                )}
                {active.email && <Row icon={Mail} label="Email" value={active.email} />}
              </div>

              <div className="text-right">
                <Link
                  href={`/candidates/${active.candidateId}`}
                  className="text-sm text-primary hover:underline"
                >
                  Xem hồ sơ ứng viên →
                </Link>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sửa thời gian PV */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa thời gian phỏng vấn</DialogTitle>
            <DialogDescription>
              Cập nhật ngày giờ phỏng vấn cho {editing?.name}. Để trống để xóa lịch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="editInterviewAt">Ngày giờ phỏng vấn</Label>
            <Input
              id="editInterviewAt"
              type="datetime-local"
              value={editing?.value ?? ""}
              onChange={(e) =>
                setEditing((m) => (m ? { ...m, value: e.target.value } : m))
              }
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={pending}>
              Hủy
            </Button>
            <Button onClick={saveEdit} disabled={pending}>
              {pending ? "Đang lưu…" : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
