"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, MapPin, X } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { PIPELINE_STAGES, REJECT_REASONS } from "@/lib/applications/constants";
import {
  removeApplication,
  updateApplicationStage,
} from "@/lib/applications/actions";

export type PipelineCard = {
  id: string;
  candidateId: string;
  name: string;
  desiredPosition: string | null;
  location: string | null;
  stage: string;
  interviewAt: string | null;
  rejectReason: string | null;
};

const STAGE_DOT: Record<string, string> = {
  new: "bg-slate-400",
  screening: "bg-blue-500",
  client_iv: "bg-amber-500",
  hired: "bg-emerald-500",
  rejected: "bg-rose-500",
};

function CardContent({ card }: { card: PipelineCard }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <Link
        href={`/candidates/${card.candidateId}`}
        className="block truncate text-sm font-medium leading-tight hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {card.name}
      </Link>
      {card.desiredPosition && (
        <p className="truncate text-xs text-muted-foreground">{card.desiredPosition}</p>
      )}
      {card.location && (
        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          <span className="truncate">{card.location}</span>
        </p>
      )}
      {card.stage === "client_iv" && card.interviewAt && (
        <p className="flex items-center gap-1 truncate text-xs font-medium text-amber-600 dark:text-amber-400">
          <CalendarClock className="size-3 shrink-0" />
          <span className="truncate">PV: {formatDateTime(card.interviewAt)}</span>
        </p>
      )}
      {card.stage === "rejected" && card.rejectReason && (
        <p className="truncate text-xs text-rose-600 dark:text-rose-400" title={card.rejectReason}>
          Lý do: {card.rejectReason}
        </p>
      )}
    </div>
  );
}

function Card({
  card,
  canManage,
  onRemove,
}: {
  card: PipelineCard;
  canManage: boolean;
  onRemove: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "group cursor-grab touch-none rounded-lg border bg-card p-2.5 shadow-sm transition hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-1">
        <CardContent card={card} />
        {canManage && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                aria-label="Xóa khỏi pipeline"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 rounded p-1 text-muted-foreground opacity-60 transition hover:bg-foreground/10 hover:text-destructive hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent onPointerDown={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Xóa khỏi pipeline?</AlertDialogTitle>
                <AlertDialogDescription>
                  {card.name} sẽ bị gỡ khỏi vị trí này. Có thể thêm lại sau.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onRemove(card.id)}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Xóa
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

function Column({
  value,
  label,
  cards,
  canManage,
  onRemove,
}: {
  value: string;
  label: string;
  cards: PipelineCard[];
  canManage: boolean;
  onRemove: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: value });
  return (
    <div className="flex min-w-[150px] flex-1 flex-col">
      <div className="mb-2 flex items-center gap-1.5 px-1">
        <span className={cn("size-2.5 shrink-0 rounded-full", STAGE_DOT[value])} />
        <span className="truncate text-sm font-semibold">{label}</span>
        <span className="ml-auto shrink-0 rounded-full bg-muted px-2 text-xs text-muted-foreground">
          {cards.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-32 flex-1 flex-col gap-2 rounded-xl border border-dashed bg-muted/30 p-1.5 transition",
          isOver && "border-primary bg-primary/5",
        )}
      >
        {cards.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-muted-foreground">Trống</p>
        ) : (
          cards.map((c) => (
            <Card key={c.id} card={c} canManage={canManage} onRemove={onRemove} />
          ))
        )}
      </div>
    </div>
  );
}

export function PipelineBoard({
  initial,
  canManage = false,
}: {
  initial: PipelineCard[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [cards, setCards] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Hộp thoại nhập thời gian PV khi chuyển sang "PV khách hàng".
  const [ivModal, setIvModal] = useState<{
    id: string;
    name: string;
    prev: PipelineCard[];
    value: string;
  } | null>(null);
  // Hộp thoại nhập lý do khi chuyển sang "Không phù hợp".
  const [rjModal, setRjModal] = useState<{
    id: string;
    name: string;
    prev: PipelineCard[];
    choice: string;
    custom: string;
  } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const activeCard = cards.find((c) => c.id === activeId) ?? null;

  function commitStage(
    id: string,
    toStage: string,
    prev: PipelineCard[],
    interviewAt?: string,
    rejectReason?: string,
  ) {
    updateApplicationStage(id, toStage, interviewAt, rejectReason).then((res) => {
      if (res?.error) {
        toast.error(res.error);
        setCards(prev);
      } else {
        toast.success("Đã chuyển giai đoạn");
        router.refresh();
      }
    });
  }

  function cancelReject() {
    if (rjModal) setCards(rjModal.prev);
    setRjModal(null);
  }

  function confirmReject() {
    if (!rjModal) return;
    const { id, prev, choice, custom } = rjModal;
    const reason = (choice === "__other__" ? custom : choice).trim();
    if (!reason) return;
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, rejectReason: reason } : c)));
    commitStage(id, "rejected", prev, undefined, reason);
    setRjModal(null);
  }

  function cancelInterview() {
    if (ivModal) setCards(ivModal.prev);
    setIvModal(null);
  }

  function confirmInterview() {
    if (!ivModal) return;
    const { id, prev, value } = ivModal;
    const iso = value ? new Date(value).toISOString() : undefined;
    if (iso) {
      setCards((cs) => cs.map((c) => (c.id === id ? { ...c, interviewAt: iso } : c)));
    }
    commitStage(id, "client_iv", prev, iso);
    setIvModal(null);
  }

  function remove(id: string) {
    const prev = cards;
    setCards((cs) => cs.filter((c) => c.id !== id));
    removeApplication(id).then((res) => {
      if (res?.error) {
        toast.error(res.error);
        setCards(prev);
      } else {
        toast.success("Đã xóa khỏi pipeline");
        router.refresh();
      }
    });
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const id = String(e.active.id);
    const toStage = e.over ? String(e.over.id) : undefined;
    if (!toStage) return;
    const card = cards.find((c) => c.id === id);
    if (!card || card.stage === toStage) return;

    const prev = cards;
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, stage: toStage } : c)));

    // Chuyển sang PV khách hàng: hỏi thời gian PV trước khi lưu.
    if (toStage === "client_iv") {
      setIvModal({ id, name: card.name, prev, value: "" });
      return;
    }
    // Chuyển sang Không phù hợp: hỏi lý do trước khi lưu.
    if (toStage === "rejected") {
      setRjModal({ id, name: card.name, prev, choice: REJECT_REASONS[0], custom: "" });
      return;
    }
    commitStage(id, toStage, prev);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-2 overflow-x-auto pb-3">
        {PIPELINE_STAGES.map((st) => (
          <Column
            key={st.value}
            value={st.value}
            label={st.label}
            cards={cards.filter((c) => c.stage === st.value)}
            canManage={canManage}
            onRemove={remove}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? (
          <div className="w-64 rotate-2 rounded-lg border bg-card p-3 shadow-lg">
            <CardContent card={activeCard} />
          </div>
        ) : null}
      </DragOverlay>

      <Dialog open={!!ivModal} onOpenChange={(o) => !o && cancelInterview()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thời gian phỏng vấn khách hàng</DialogTitle>
            <DialogDescription>
              Chọn ngày giờ phỏng vấn cho {ivModal?.name}. Có thể bỏ trống nếu chưa chốt.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="interviewAt">Ngày giờ phỏng vấn</Label>
            <Input
              id="interviewAt"
              type="datetime-local"
              value={ivModal?.value ?? ""}
              onChange={(e) =>
                setIvModal((m) => (m ? { ...m, value: e.target.value } : m))
              }
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={cancelInterview}>
              Hủy
            </Button>
            <Button onClick={confirmInterview}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lý do khi chuyển sang Không phù hợp */}
      <Dialog open={!!rjModal} onOpenChange={(o) => !o && cancelReject()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lý do không phù hợp</DialogTitle>
            <DialogDescription>Chọn lý do cho {rjModal?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {[...REJECT_REASONS, "__other__"].map((r) => {
              const selected = rjModal?.choice === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRjModal((m) => (m ? { ...m, choice: r } : m))}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg border p-2.5 text-left text-sm transition",
                    selected ? "border-primary bg-primary/5" : "hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "size-4 shrink-0 rounded-full border-2",
                      selected
                        ? "border-[5px] border-primary"
                        : "border-muted-foreground/40",
                    )}
                  />
                  {r === "__other__" ? "Khác (nhập lý do)" : r}
                </button>
              );
            })}
            {rjModal?.choice === "__other__" && (
              <Input
                autoFocus
                value={rjModal.custom}
                onChange={(e) =>
                  setRjModal((m) => (m ? { ...m, custom: e.target.value } : m))
                }
                placeholder="Nhập lý do…"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={cancelReject}>
              Hủy
            </Button>
            <Button
              onClick={confirmReject}
              disabled={rjModal?.choice === "__other__" && !rjModal.custom.trim()}
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
