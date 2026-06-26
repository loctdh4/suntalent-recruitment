import { ListPageSkeleton } from "@/components/page-skeletons";

export default function Loading() {
  return <ListPageSkeleton cols={8} filters={3} stats={3} />;
}
