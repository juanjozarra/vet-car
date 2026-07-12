import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full border border-transparent px-2.5 py-1 text-xs font-medium transition-all focus-visible:ring-3 focus-visible:ring-ring/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/85",
        secondary:
          "bg-white/[0.06] text-secondary-foreground ring-1 ring-white/[0.08] ring-inset [a]:hover:bg-white/[0.1]",
        destructive:
          "bg-destructive/12 text-[#ff9b96] ring-1 ring-destructive/25 ring-inset",
        outline: "ring-1 ring-white/[0.12] ring-inset text-muted-foreground",
        ghost: "hover:bg-white/[0.05] hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Instrument status pills — mono microtype, dash-lamp tints
        active:
          "bg-primary/12 text-primary ring-1 ring-primary/25 ring-inset font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em]",
        ok:
          "bg-ok/10 text-ok ring-1 ring-ok/25 ring-inset font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em]",
        idle:
          "bg-white/[0.05] text-muted-foreground ring-1 ring-white/[0.08] ring-inset font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

// Tiny status LED for badges — <BadgeDot className="bg-ok" />
function BadgeDot({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="badge-dot"
      aria-hidden="true"
      className={cn("size-1.5 shrink-0 rounded-full bg-current", className)}
      {...props}
    />
  )
}

export { Badge, BadgeDot, badgeVariants }
