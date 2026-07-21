import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="flex flex-col xl:flex-row">
      <div className="flex-1 space-y-6 p-4 lg:p-8">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="flex justify-center">
              <Skeleton className="size-[180px] rounded-full" />
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-4 md:col-span-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-none shadow-sm">
                <CardContent className="flex items-center gap-3 p-4">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-8" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <aside className="w-full shrink-0 space-y-6 p-4 xl:w-80 xl:p-6">
        <Skeleton className="h-72 w-full rounded-xl" />
      </aside>
    </div>
  );
}
