import { ArrowRightIcon, ArrowUpIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationStatusIconProps {
  status: "unresolved" | "resolved" | "escalated";
}

const statusConfig = {
  resolved: {
    icon: CheckIcon,
    bgColor: "bg-green-500",
  },
  unresolved: {
    icon: ArrowRightIcon,
    bgColor: "bg-red-500",
  },
  escalated: {
    icon: ArrowUpIcon,
    bgColor: "bg-yellow-500",
  },
} as const;

export const ConversationStatusIcon = ({
  status,
}: ConversationStatusIconProps) => {
  const config = statusConfig[status];
  const IconComponent = config.icon;
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full size-5 shrink-0",
        config.bgColor,
      )}
    >
      <IconComponent className="size-3 stroke-3 text-white" />
    </div>
  );
};
