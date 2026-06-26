"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addCandidateToJob } from "@/lib/applications/actions";

export function AddToJobButton({
  jobId,
  candidateId,
  added,
}: {
  jobId: string;
  candidateId: string;
  added: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [optimisticAdded, setOptimisticAdded] = useOptimistic(added);

  if (optimisticAdded) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="size-3.5" /> Đã thêm
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setOptimisticAdded(true);
          const res = await addCandidateToJob(jobId, candidateId);
          if (res?.error) toast.error(res.error);
          else {
            toast.success("Đã thêm vào vị trí");
            router.refresh();
          }
        })
      }
    >
      <Plus className="size-4" /> Thêm
    </Button>
  );
}
