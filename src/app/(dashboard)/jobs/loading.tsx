import { ListPageSkeleton } from "@/components/page-skeletons";

export default function Loading() {
  return <ListPageSkeleton cols={8} filters={5} stats={2} />;
}
