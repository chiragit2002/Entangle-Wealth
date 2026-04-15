import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "whitespace-nowrap inline-flex items-center border px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-ring",
  {
    variants: {
      variant: {
        default:
          "border-primary/30 bg-primary/10 text-primary",
        secondary:
          "border-[rgba(0,180,216,0.15)] bg-secondary text-secondary-foreground",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive",
        outline: "text-foreground [border-color:var(--badge-outline)]",
        success:
          "border-[rgba(0,180,216,0.3)] bg-[rgba(0,180,216,0.08)] text-[#00B4D8]",
        warning:
          "border-[rgba(255,184,0,0.3)] bg-[rgba(255,184,0,0.08)] text-[#FFB800]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
