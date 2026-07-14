"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { CheckIcon } from "@/components/ui/icons"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-5 shrink-0 items-center justify-center rounded-[0.4rem] border border-white/[0.14] bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition-[background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] after:absolute after:-inset-x-3 after:-inset-y-2 hover:border-white/25 focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50 group-has-disabled/field:opacity-50 aria-invalid:border-destructive/60 aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-checked:border-primary/60 data-checked:bg-primary data-checked:text-primary-foreground data-checked:shadow-[0_4px_14px_-4px_rgba(242,179,80,0.5)]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" strokeWidth={2} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
