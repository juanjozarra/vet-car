import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full text-sm font-medium whitespace-nowrap select-none outline-none transition-[transform,background-color,border-color,box-shadow,color,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-40 aria-invalid:ring-3 aria-invalid:ring-destructive/30 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_28px_-12px_rgba(242,179,80,0.5)] hover:bg-[#ffc76a]",
        secondary:
          "bg-white/[0.07] text-foreground ring-1 ring-white/[0.09] ring-inset shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.11] aria-expanded:bg-white/[0.11]",
        outline:
          "border border-white/[0.13] bg-transparent text-foreground hover:border-white/25 hover:bg-white/[0.04] aria-expanded:bg-white/[0.04]",
        ghost:
          "text-muted-foreground hover:bg-white/[0.05] hover:text-foreground aria-expanded:bg-white/[0.05] aria-expanded:text-foreground",
        destructive:
          "bg-destructive/12 text-[#ff9b96] ring-1 ring-destructive/25 ring-inset hover:bg-destructive/20 focus-visible:ring-destructive/30",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 gap-2 px-6",
        xs: "h-8 gap-1.5 px-3.5 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-9 gap-1.5 px-4 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 gap-2 px-7",
        icon: "size-11",
        "icon-xs": "size-8 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

// Button-in-Button trailing icon — a distinct circular island nested flush
// against the pill's right padding (see DESIGN.md §CTA).
function ButtonIconIsland({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="button-icon-island"
      className={cn(
        "-mr-3 ml-1 flex size-7 items-center justify-center rounded-full bg-black/10 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/button:-translate-y-px group-hover/button:translate-x-0.5 group-hover/button:scale-105 [[data-variant=ghost]_&,[data-variant=outline]_&,[data-variant=secondary]_&]:bg-white/10",
        className
      )}
      {...props}
    />
  )
}

export { Button, ButtonIconIsland, buttonVariants }
