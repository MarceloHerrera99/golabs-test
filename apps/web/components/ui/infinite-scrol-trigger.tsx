import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface InfiniteScrollTriggerProps {
  canLoadMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  loadMoreText?: string;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}

export const InfiniteScrollTrigger = ({
  canLoadMore,
  isLoadingMore,
  onLoadMore,
  loadMoreText = "Load more",
  className,
  ref,
}: InfiniteScrollTriggerProps) => {
  if (!canLoadMore) {
    return <div ref={ref} />;
  }

  return (
    <div ref={ref} className={cn("flex w-full justify-center py-2", className)}>
      <Button
        disabled={isLoadingMore}
        onClick={onLoadMore}
        size="sm"
        variant="ghost"
      >
        {isLoadingMore ? "Loading..." : loadMoreText}
      </Button>
    </div>
  );
};
