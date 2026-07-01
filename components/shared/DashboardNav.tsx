import Link from 'next/link'
import { BellIcon, GearIcon } from '@/components/ui/icons'
import { AvatarMenu } from './AvatarMenu'
import styles from './DashboardNav.module.scss'

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
    <header className={`${styles.nav} fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-8`}>
      <div className="flex items-center gap-4">
        <span className={`${styles.logo} text-2xl font-bold tracking-tight`}>
          VetCar
        </span>
        <nav className="flex items-center gap-4 ml-4">
          <Link href="/owner" className={`${active === 'panel' ? styles.navLinkActive : styles.navLink} text-sm`}>
            Panel
          </Link>
          <Link href="/owner/schedule" className={`${active === 'schedule' ? styles.navLinkActive : styles.navLink} text-sm`}>
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
