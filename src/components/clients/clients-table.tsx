"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { deleteClient } from "@/lib/clients/actions";
import { CLIENT_TYPE_LABEL } from "@/lib/clients/constants";
import { ClientFormDialog, type ClientRow } from "./client-form-dialog";
import { Pagination } from "@/components/pagination";
import type { PageInfo } from "@/lib/pagination";

export function ClientsTable({
  clients,
  query = "",
  pageInfo,
}: {
  clients: ClientRow[];
  query?: string;
  pageInfo?: PageInfo;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    startTransition(async () => {
      const res = await deleteClient(id);
      if (res?.error) toast.error(res.error);
      else {
        toast.success("Đã xóa đối tác");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Đối tác ({clients.length})</CardTitle>
        <ClientFormDialog
          trigger={
            <Button>
              <Plus className="size-4" /> Thêm đối tác
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {query
              ? "Không có đối tác khớp từ khóa. Thử đổi từ khóa tìm kiếm."
              : 'Chưa có đối tác nào. Bấm "Thêm đối tác" để bắt đầu.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Số điện thoại</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Địa điểm</TableHead>
                <TableHead>Người phụ trách</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link href={`/clients/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {CLIENT_TYPE_LABEL[c.type] ?? "Doanh nghiệp"}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell>{c.location ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.createdByName ?? c.createdByEmail ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <ClientFormDialog
                        client={c}
                        trigger={
                          <Button variant="ghost" size="icon" aria-label="Sửa">
                            <Pencil className="size-4" />
                          </Button>
                        }
                      />
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
                            <AlertDialogTitle>Xóa đối tác?</AlertDialogTitle>
                            <AlertDialogDescription>
                              {c.name} sẽ bị xóa. Hành động không thể hoàn tác.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => remove(c.id)}
                              className="bg-destructive text-white hover:bg-destructive/90"
                            >
                              Xóa
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {pageInfo && <Pagination info={pageInfo} label="đối tác" />}
    </Card>
  );
}
