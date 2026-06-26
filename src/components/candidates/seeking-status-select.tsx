"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSeekingStatus } from "@/lib/candidates/actions";
import { SEEKING_LABEL } from "@/lib/candidates/constants";

export function SeekingStatusSelect({
  candidateId,
  value,
  canEdit,
}: {
  candidateId: string;
  value: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!canEdit) {
    return (
      <span className="text-sm text-muted-foreground">
        {SEEKING_LABEL[value] ?? value}
      </span>
    );
  }

  return (
    <Select
      value={value}
      disabled={pending}
      onValueChange={(v) =>
        startTransition(async () => {
          const res = await updateSeekingStatus(candidateId, v);
          if (res?.error) toast.error(res.error);
          else {
            toast.success("Đã cập nhật trạng thái tìm việc");
            router.refresh();
          }
        })
      }
    >
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(SEEKING_LABEL).map(([k, label]) => (
          <SelectItem key={k} value={k}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
