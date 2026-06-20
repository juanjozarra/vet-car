export function DashboardFooter() {
  return (
    <footer className="bg-[#171f33] border-t border-[#434655] flex items-center justify-between px-8 py-8">
      <span className="text-2xl font-bold text-[#dae2fd] tracking-[0.6px]">
        AutoStream Pro
      </span>
      <span className="text-xs font-medium text-[#c3c6d7] tracking-[0.6px]">
        © 2024 AutoStream Pro Management Systems. All rights reserved.
      </span>
      <nav className="flex items-center gap-4">
        {['Privacy Policy', 'Terms of Service', 'Contact Support', 'Fleet Solutions'].map(link => (
          <span key={link} className="text-xs font-medium text-[#c3c6d7] tracking-[0.6px] cursor-pointer hover:text-[#dae2fd] transition-colors">
            {link}
          </span>
        ))}
      </nav>
    </footer>
  )
}
