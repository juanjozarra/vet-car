export function DashboardFooter() {
  return (
    <footer className="flex items-center justify-between px-8 py-8 bg-card border-t border-border">
      <span className="text-2xl font-bold text-foreground font-mono tracking-[0.037em]">VetCar</span>
      <span className="text-xs font-medium text-muted-foreground tracking-[0.037em]">
        © 2024 VetCar. Todos los derechos reservados.
      </span>
      <nav className="flex items-center gap-4">
        {['Política de privacidad', 'Términos del servicio', 'Contactar soporte', 'Soluciones para flotas'].map(link => (
          <span key={link} className="text-xs font-medium text-muted-foreground tracking-[0.037em] transition-colors cursor-pointer hover:text-foreground">{link}</span>
        ))}
      </nav>
    </footer>
  )
}
