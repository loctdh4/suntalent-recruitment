"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import {
  createClient,
  updateClient,
  type ClientActionState,
} from "@/lib/clients/actions";
import { CLIENT_TYPE_OPTIONS } from "@/lib/clients/constants";

export type ClientRow = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
};

export function ClientFormDialog({
  client,
  trigger,
}: {
  client?: ClientRow;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const isEdit = !!client;
  const [open, setOpen] = useState(false);
  const [type, setType] = useState(client?.type ?? "business");
  const [state, formAction, pending] = useActionState<ClientActionState, FormData>(
    isEdit ? updateClient : createClient,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(isEdit ? "Đã cập nhật đối tác" : "Đã thêm đối tác");
      setOpen(false);
      router.refresh();
    }
  }, [state, isEdit, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          {isEdit && <input type="hidden" name="id" value={client.id} />}
          <DialogHeader>
            <DialogTitle>{isEdit ? "Sửa đối tác" : "Thêm đối tác"}</DialogTitle>
            <DialogDescription>
              Thông tin đối tác/khách hàng. Chỉ tên là bắt buộc.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên đối tác *</Label>
              <Input id="name" name="name" defaultValue={client?.name} required />
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
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" name="phone" defaultValue={client?.phone ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={client?.email ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Địa điểm</Label>
              <LocationSelect id="location" name="location" defaultValue={client?.location} />
            </div>
            {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Đang lưu…" : isEdit ? "Lưu" : "Thêm"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
