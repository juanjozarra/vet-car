import { Logo } from './Logo'

export function DashboardFooter() {
  return (
    <footer className="relative mt-24 border-t border-white/[0.06] px-6 py-12 sm:px-10">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1.5">
          <Logo className="text-base" />
          <span className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
            Historial de servicio vehicular
          </span>
        </div>
        <span className="text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} VetCar — Todos los derechos reservados.
        </span>
      </div>
    </footer>
  )
}
