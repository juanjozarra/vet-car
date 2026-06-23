import styles from './DashboardFooter.module.scss'

export function DashboardFooter() {
  return (
    <footer className={`${styles.footer} flex items-center justify-between px-8 py-8`}>
      <span className={`${styles.logo} text-2xl font-bold`}>AutoStream Pro</span>
      <span className={`${styles.copyright} text-xs font-medium`}>
        © 2024 AutoStream Pro Management Systems. All rights reserved.
      </span>
      <nav className="flex items-center gap-4">
        {['Privacy Policy', 'Terms of Service', 'Contact Support', 'Fleet Solutions'].map(link => (
          <span key={link} className={`${styles.link} text-xs font-medium`}>{link}</span>
        ))}
      </nav>
    </footer>
  )
}
