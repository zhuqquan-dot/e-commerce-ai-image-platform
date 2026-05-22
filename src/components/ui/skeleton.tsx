import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-md animate-shimmer bg-[length:200%_100%]",
        className
      )}
      style={{
        backgroundImage:
          "linear-gradient(90deg, #E8E6E1 25%, #F5F3F0 50%, #E8E6E1 75%)",
      }}
      {...props}
    />
  )
}

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/6" />
      <Skeleton className="h-4 w-1/6" />
      <Skeleton className="h-4 w-1/6" />
      <Skeleton className="h-4 w-1/5" />
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonRow }
