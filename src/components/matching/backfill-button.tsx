"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { backfillEmbeddings } from "@/lib/matching/actions";

export function BackfillButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await backfillEmbeddings();
          if (res.error) toast.error(res.error);
          else {
            toast.success(
              `Đã tạo embedding: ${res.candidates ?? 0} ứng viên, ${res.jobs ?? 0} vị trí`,
            );
            router.refresh();
          }
        })
      }
    >
      <Sparkles className="size-4" /> {pending ? "Đang tạo…" : "Tạo embedding"}
    </Button>
  );
}
