"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignRecruiter, removeRecruiter } from "@/lib/jobs/actions";

type Person = { id: string; fullName: string | null; email: string };

export function JobRecruiters({
  jobId,
  assigned,
  assignable,
  canManage,
}: {
  jobId: string;
  assigned: Person[];
  assignable: Person[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const free = assignable.filter((p) => !assigned.some((a) => a.id === p.id));

  function add(recruiterId: string) {
    startTransition(async () => {
      const res = await assignRecruiter(jobId, recruiterId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Đã gán HR");
        router.refresh();
      }
    });
  }

  function remove(recruiterId: string) {
    startTransition(async () => {
      const res = await removeRecruiter(jobId, recruiterId);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Đã gỡ HR");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {assigned.length === 0 && (
          <p className="text-sm text-muted-foreground">Chưa gán HR nào.</p>
        )}
        {assigned.map((p) => (
          <Badge key={p.id} variant="secondary" className="gap-1.5 py-1.5 pl-3 pr-1.5">
            {p.fullName ?? p.email}
            {canManage && (
              <button
                type="button"
                onClick={() => remove(p.id)}
                disabled={pending}
                aria-label="Gỡ"
                className="rounded-full p-0.5 hover:bg-foreground/10"
              >
                <X className="size-3.5" />
              </button>
            )}
          </Badge>
        ))}
      </div>

      {canManage && free.length > 0 && (
        <Select onValueChange={add} disabled={pending}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="+ Thêm HR phụ trách" />
          </SelectTrigger>
          <SelectContent>
            {free.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.fullName ?? p.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
