import Link from 'next/link'
import { BellIcon, GearIcon } from '@/components/ui/icons'
import { AvatarMenu } from './AvatarMenu'
import { cn } from '@/lib/utils'

export interface DashboardNavItem {
  key: string
  href: string
  label: string
}

const DEFAULT_OWNER_NAV_ITEMS: DashboardNavItem[] = [
  { key: 'panel', href: '/owner', label: 'Panel' },
  { key: 'schedule', href: '/owner/schedule', label: 'Agendar' },
]

export function DashboardNav({
  userName,
  userEmail,
  userImage,
  items = DEFAULT_OWNER_NAV_ITEMS,
  active = 'panel',
}: {
  userName: string
  userEmail?: string
  userImage?: string | null
  items?: DashboardNavItem[]
  active?: string
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-8 bg-card border-b border-border">
      <div className="flex items-center gap-4">
        <span className="text-2xl font-bold tracking-tight text-primary font-mono">
          VetCar
        </span>
        <nav className="flex items-center gap-4 ml-4">
          {items.map(item => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                'text-sm transition-colors cursor-pointer',
                active === item.key
                  ? 'text-primary border-b-2 border-primary pb-1.5'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
            </Link>
          ))}
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
