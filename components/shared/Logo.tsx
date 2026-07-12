import { cn } from '@/lib/utils'

// VetCar wordmark — Clash Display + amber LED tick (dash-lamp motif)
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1.5 font-display font-semibold tracking-[-0.02em] text-foreground',
        className
      )}
    >
      VetCar
      <span
        aria-hidden="true"
        className="mb-[0.18em] inline-block size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_10px_rgba(242,179,80,0.9)]"
      />
    </span>
  )
}
