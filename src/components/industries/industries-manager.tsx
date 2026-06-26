"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  createIndustry,
  deleteIndustry,
  type IndustryActionState,
} from "@/lib/industries/actions";

export function IndustriesManager({
  industries,
}: {
  industries: { id: string; name: string }[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [state, formAction] = useActionState<IndustryActionState, FormData>(
    createIndustry,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Đã thêm ngành nghề");
      formRef.current?.reset();
      router.refresh();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state, router]);

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteIndustry(id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Đã xóa ngành nghề");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      <form ref={formRef} action={formAction} className="flex gap-2">
        <Input name="name" placeholder="Tên ngành nghề mới…" className="sm:w-72" required />
        <Button type="submit">
          <Plus className="size-4" /> Thêm
        </Button>
      </form>

      {industries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có ngành nghề nào.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {industries.map((i) => (
            <Badge
              key={i.id}
              variant="secondary"
              className="gap-1.5 py-1.5 pl-3 pr-1.5 text-sm font-normal"
            >
              {i.name}
              <button
                type="button"
                onClick={() => remove(i.id)}
                disabled={pending}
                aria-label={`Xóa ${i.name}`}
                className="rounded-full p-0.5 hover:bg-foreground/10 hover:text-destructive"
              >
                <X className="size-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
