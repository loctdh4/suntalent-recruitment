"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createTeamMember,
  updateMemberRole,
  deleteMember,
  type TeamActionState,
} from "@/lib/admin/actions";
import { formatDate } from "@/lib/format";

const ROLES = [
  "recruiter",
  "recruiter_intern",
  "sales",
  "sales_intern",
  "admin",
] as const;
const ROLE_LABEL: Record<string, string> = {
  recruiter: "HR",
  recruiter_intern: "HR intern",
  sales: "Sales",
  sales_intern: "Sale intern",
  admin: "Manager",
};

type Member = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  createdAt: string | Date;
};

export function TeamTable({
  members,
  currentUserId,
}: {
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newRole, setNewRole] = useState<string>("recruiter");
  const [pending, startTransition] = useTransition();
  const [state, formAction, creating] = useActionState<TeamActionState, FormData>(
    createTeamMember,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Đã tạo thành viên");
      setOpen(false);
      router.refresh();
    }
  }, [state, router]);

  function changeRole(id: string, role: string) {
    startTransition(async () => {
      const res = await updateMemberRole(id, role);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Đã cập nhật vai trò");
        router.refresh();
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteMember(id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Đã xóa thành viên");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Thành viên ({members.length})</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="size-4" /> Thêm thành viên
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form action={formAction}>
              <DialogHeader>
                <DialogTitle>Thêm thành viên</DialogTitle>
                <DialogDescription>
                  Tạo tài khoản mới và gán vai trò. Mật khẩu do bạn đặt, gửi lại cho thành viên.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ tên</Label>
                  <Input id="fullName" name="fullName" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <Input id="password" name="password" type="password" required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label>Vai trò</Label>
                  <input type="hidden" name="role" value={newRole} />
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {state?.error && (
                  <p className="text-sm text-destructive">{state.error}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={creating}>
                  {creating ? "Đang tạo…" : "Tạo tài khoản"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thành viên</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Ngày tạo</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => {
              const isSelf = m.id === currentUserId;
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium">{m.fullName ?? "—"}</div>
                    <div className="text-sm text-muted-foreground">{m.email}</div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={m.role}
                      onValueChange={(v) => changeRole(m.id, v)}
                      disabled={isSelf || pending}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(m.createdAt)}
                  </TableCell>
                  <TableCell>
                    {!isSelf && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={pending}
                            aria-label="Xóa"
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Xóa thành viên?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {m.fullName ?? m.email} sẽ bị xóa khỏi hệ thống. Hành
                              động này không thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => remove(m.id)}
                              className="bg-destructive text-white hover:bg-destructive/90"
                            >
                              Xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
