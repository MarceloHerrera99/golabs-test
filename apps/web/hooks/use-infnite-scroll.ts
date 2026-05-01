import { useCallback, useEffect, useRef } from "react";

interface UseInifniteScrollProps {
  status: "CanLoadMore" | "LoadingMore" | "Exhausted" | "LoadingFirstPage";
  loadMore: (numItems: number) => void;
  loadSize?: number;
  observedEnabled?: boolean;
}

export const useInifniteScroll = ({
  status,
  loadMore,
  loadSize = 10,
  observedEnabled = true,
}: UseInifniteScrollProps) => {
  const topElementRef = useRef<HTMLDivElement | null>(null);

  const handleLoadMore = useCallback(() => {
    if (status === "CanLoadMore") {
      loadMore(loadSize);
    }
  }, [loadMore, loadSize, status]);

  useEffect(() => {
    const topElement = topElementRef.current;
    if (!topElement || !observedEnabled) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(topElement);

    return () => {
      observer.disconnect();
    };
  }, [handleLoadMore, observedEnabled]);

  return {
    topElementRef,
    handleLoadMore,
    canLoadMore: status === "CanLoadMore",
    isLoadingMore: status === "LoadingMore",
    isExhausted: status === "Exhausted",
    isLoadingFirstPage: status === "LoadingFirstPage",
  };
};
