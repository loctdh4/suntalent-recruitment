"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Briefcase,
  Building2,
  Check,
  Mail,
  MapPin,
  Pencil,
  Phone,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDate, formatTime, formatJobCode } from "@/lib/format";
import { relBadge, toLocalInput } from "@/components/jobs/interview-schedule";
import { AddToCalendar } from "@/components/calendar/add-to-calendar";
import {
  setInterviewAttended,
  updateInterviewAt,
} from "@/lib/applications/actions";

export type InterviewRow = {
  appId: string;
  candidateId: string;
  name: string;
  phone: string | null;
  email: string | null;
  desiredPosition: string | null;
  candidateLocation: string | null;
  interviewAt: string;
  relDays: number;
  isPast: boolean;
  attended: boolean;
  jobId: string;
  jobCode: number;
  jobTitle: string;
  clientName: string | null;
  jobLocation: string | null;
  saleName: string | null;
  hrNames: string[];
};

function InfoRow({
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

export function InterviewsTable({
  rows,
  canManage = false,
}: {
  rows: InterviewRow[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState<InterviewRow | null>(null);
  const [editing, setEditing] = useState<{ appId: string; name: string; value: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function saveEdit() {
    if (!editing) return;
    const { appId, value } = editing;
    startTransition(async () => {
      const res = await updateInterviewAt(appId, value ? new Date(value).toISOString() : null);
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

  function badge(r: InterviewRow) {
    if (r.attended)
      return (
        <Badge className="border-transparent bg-emerald-100 font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          Đã đến PV
        </Badge>
      );
    if (r.isPast)
      return (
        <Badge className="border-transparent bg-slate-200 font-medium text-slate-600 dark:bg-slate-500/20 dark:text-slate-300">
          Đã qua
        </Badge>
      );
    return (
      <Badge className={cn("font-medium", relBadge(r.relDays).cls)}>
        {relBadge(r.relDays).text}
      </Badge>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tất cả lịch phỏng vấn ({rows.length})</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">
            Chưa có lịch phỏng vấn nào.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Khi nào</TableHead>
                <TableHead>Ứng viên</TableHead>
                <TableHead>Vị trí</TableHead>
                <TableHead>Khách hàng</TableHead>
                <TableHead>Sale</TableHead>
                <TableHead>HR</TableHead>
                <TableHead>Thời gian PV</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.appId}>
                  <TableCell>{badge(r)}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setActive(r)}
                      className="cursor-pointer text-left font-medium hover:underline"
                    >
                      {r.name}
                    </button>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
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
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/jobs/${r.jobId}`}
                      className="font-medium hover:underline"
                    >
                      <span className="text-primary">#{formatJobCode(r.jobCode)}</span>{" "}
                      {r.jobTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.clientName ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.saleName ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.hrNames.length === 0
                      ? "—"
                      : r.hrNames.length <= 2
                        ? r.hrNames.join(", ")
                        : `${r.hrNames.slice(0, 2).join(", ")} +${r.hrNames.length - 2}`}
                  </TableCell>
                  <TableCell className="text-sm font-medium whitespace-nowrap text-amber-600 dark:text-amber-400">
                    {formatTime(r.interviewAt)} · {formatDate(r.interviewAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <AddToCalendar
                        title={`PV: ${r.name} - ${r.jobTitle}`}
                        startISO={r.interviewAt}
                        location={r.jobLocation ?? r.candidateLocation ?? ""}
                        description={[
                          `Ứng viên: ${r.name}`,
                          r.phone ? `SĐT: ${r.phone}` : "",
                          r.email ? `Email: ${r.email}` : "",
                          `Vị trí: ${r.jobTitle}`,
                          `Khách hàng: ${r.clientName ?? "—"}`,
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
                          className={r.attended ? "text-emerald-600 dark:text-emerald-400" : ""}
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
                            setEditing({
                              appId: r.appId,
                              name: r.name,
                              value: toLocalInput(r.interviewAt),
                            })
                          }
                        >
                          <Pencil className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Phiếu lịch PV */}
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
                <p className="mt-1 text-3xl font-bold">{formatTime(active.interviewAt)}</p>
                <p className="text-sm font-medium text-muted-foreground">
                  Ngày {formatDate(active.interviewAt)}
                </p>
              </div>
              <div className="space-y-3">
                <InfoRow icon={Briefcase} label="Vị trí phỏng vấn" value={active.jobTitle} />
                <InfoRow
                  icon={Building2}
                  label="Khách hàng / đối tác"
                  value={active.clientName ?? "—"}
                />
                {(active.jobLocation || active.candidateLocation) && (
                  <InfoRow
                    icon={MapPin}
                    label="Địa điểm"
                    value={active.jobLocation ?? active.candidateLocation!}
                  />
                )}
                <InfoRow icon={User} label="Ứng viên" value={active.name} />
                {active.phone && (
                  <InfoRow icon={Phone} label="Số điện thoại" value={active.phone} />
                )}
                {active.email && <InfoRow icon={Mail} label="Email" value={active.email} />}
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
            <Label htmlFor="editIvAt">Ngày giờ phỏng vấn</Label>
            <Input
              id="editIvAt"
              type="datetime-local"
              value={editing?.value ?? ""}
              onChange={(e) => setEditing((m) => (m ? { ...m, value: e.target.value } : m))}
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
    </Card>
  );
}
