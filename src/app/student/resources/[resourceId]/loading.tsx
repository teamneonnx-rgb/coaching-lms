import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl p-4 lg:p-8">
      <Skeleton className="mb-4 h-4 w-40" />
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-9 w-36" />
      </div>
      <Skeleton className="aspect-video w-full rounded-lg" />
    </div>
  );
}
