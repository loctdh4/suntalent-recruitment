"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationSelect } from "@/components/ui/location-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { quickCreateClient, type QuickClientState } from "@/lib/clients/actions";
import { CLIENT_TYPE_OPTIONS } from "@/lib/clients/constants";

/** Nút "+" mở dialog thêm đối tác mới; gọi onCreated với bản ghi vừa tạo. */
export function ClientQuickAdd({
  onCreated,
}: {
  onCreated: (client: { id: string; name: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("business");
  const [state, formAction, pending] = useActionState<QuickClientState, FormData>(
    quickCreateClient,
    undefined,
  );

  useEffect(() => {
    if (state?.client) {
      toast.success("Đã thêm đối tác");
      onCreated(state.client);
      setOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="Thêm đối tác mới">
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Thêm đối tác</DialogTitle>
            <DialogDescription>
              Thông tin đối tác/khách hàng. Chỉ tên là bắt buộc.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="qa-name">Tên đối tác *</Label>
              <Input id="qa-name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label>Loại</Label>
              <input type="hidden" name="type" value={type} />
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qa-phone">Số điện thoại</Label>
              <Input id="qa-phone" name="phone" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qa-email">Email</Label>
              <Input id="qa-email" name="email" type="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qa-location">Địa điểm</Label>
              <LocationSelect id="qa-location" name="location" />
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu…" : "Thêm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
