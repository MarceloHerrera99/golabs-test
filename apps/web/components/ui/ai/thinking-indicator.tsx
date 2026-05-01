import { cn } from "@/lib/utils";

export type AIThinkingIndicatorProps = React.HTMLAttributes<HTMLDivElement>;

export const AIThinkingIndicator = ({
  className,
  ...props
}: AIThinkingIndicatorProps) => (
  <div
    className={cn("flex items-center gap-1 py-1", className)}
    {...props}
  >
    <span className="size-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
    <span className="size-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
    <span className="size-2 animate-bounce rounded-full bg-current" />
  </div>
);
