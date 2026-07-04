import Link from 'next/link'
import { BellIcon, GearIcon } from '@/components/ui/icons'
import { AvatarMenu } from './AvatarMenu'
import { cn } from '@/lib/utils'

// ponytail: nav is owner-only for now (mechanic dashboard is still a stub), so
// links are hardcoded to the owner routes. Revisit if the mechanic dashboard
// grows and needs this same shell — make items a prop then.
export function DashboardNav({
  userName,
  userEmail,
  userImage,
  active = 'panel',
}: {
  userName: string
  userEmail?: string
  userImage?: string | null
  active?: 'panel' | 'schedule'
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-8 bg-card border-b border-border">
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold tracking-tight text-primary font-mono">
          VetCar
        </span>
        <nav className="flex items-center gap-4 ml-4">
          <Link
            href="/owner"
            className={cn(
              'text-sm transition-colors cursor-pointer',
              active === 'panel'
                ? 'text-primary border-b-2 border-primary pb-1.5'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Panel
          </Link>
          <Link
            href="/owner/schedule"
            className={cn(
              'text-sm transition-colors cursor-pointer',
              active === 'schedule'
                ? 'text-primary border-b-2 border-primary pb-1.5'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Agendar
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button className="p-1 hover:opacity-70 transition-opacity"><BellIcon /></button>
          <button className="p-1 hover:opacity-70 transition-opacity"><GearIcon /></button>
        </div>
        <AvatarMenu userName={userName} userEmail={userEmail} userImage={userImage} />
      </div>
    </header>
  )
}
