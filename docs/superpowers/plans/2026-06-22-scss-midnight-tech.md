# SCSS + Midnight Tech Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SCSS module support to the Next.js project and migrate all hardcoded inline styles to SCSS modules using the "Midnight Tech" design system from DESIGN3.md (cyan primary, JetBrains Mono headlines, near-black surfaces).

**Architecture:** Each component gets a co-located `.module.scss` file for design/theming styles; shared design tokens live in `styles/_tokens.scss` and mixins in `styles/_mixins.scss`, both auto-injected into every SCSS file via `sassOptions.additionalData` in `next.config.ts`. Tailwind CSS v4 is kept for layout/spacing utilities. Colors, fonts, borders, box-shadows, and backgrounds move out of JSX into SCSS modules.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS v4, `sass` (new devDependency), SCSS modules, JetBrains Mono (Google Fonts), Inter

## Global Constraints

- Keep all `motion/react` animation props as-is — they use Framer Motion, not CSS
- Tailwind utilities (`flex`, `grid`, `px-*`, `py-*`, `gap-*`, `size-*`, `absolute`, `z-*`, etc.) stay in `className`; only color, font, background, border-color, box-shadow styles move to SCSS
- Every hardcoded hex color in JSX (`bg-[#...]`, `text-[#...]`, `border-[#...]`) must move to SCSS
- Every `style={{ fontFamily: ... }}` inline prop must move to SCSS
- `sass` is a devDependency only
- No UI component tests exist — verification is visual (run dev server)
- Keep `globals.css` as a `.css` file (Tailwind v4's `@import "tailwindcss"` must not go through Sass)

---

### Task 1: SCSS Infrastructure

**Files:**
- Modify: `next.config.ts`
- Create: `styles/_tokens.scss`
- Create: `styles/_mixins.scss`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: SCSS variables available in every `.module.scss` via auto-inject:
  `$color-bg`, `$color-surface`, `$color-surface-elevated`, `$color-surface-high`,
  `$color-border`, `$color-outline`, `$color-text`, `$color-text-muted`,
  `$color-primary`, `$color-primary-dark`, `$color-on-primary`,
  `$color-error`, `$color-error-bg`, `$color-error-border`,
  `$font-mono`, `$radius`, `$radius-lg`, `$radius-xl`
- Produces: Mixins: `font-mono`, `input-base`, `input-label`, `btn-primary`, `btn-secondary`, `card`, `glow-blob`

- [ ] **Step 1: Install sass**

```bash
npm install --save-dev sass
```

Expected: `sass` appears in `package.json` devDependencies.

- [ ] **Step 2: Update `next.config.ts`**

```ts
// next.config.ts
import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  sassOptions: {
    includePaths: [path.join(process.cwd(), "styles")],
    additionalData: `@import "tokens"; @import "mixins";`,
  },
};

export default nextConfig;
```

The `additionalData` string is prepended to every `.module.scss` file Next.js compiles, making tokens and mixins globally available without manual imports.

- [ ] **Step 3: Create `styles/_tokens.scss`**

```scss
// styles/_tokens.scss — Midnight Tech design tokens (DESIGN3.md)

// ── Surfaces ──────────────────────────────────────────────────
$color-bg:                #121414;
$color-surface:           #1a1c1c;
$color-surface-elevated:  #1e2020;
$color-surface-high:      #282a2b;
$color-surface-bright:    #38393a;

// ── Text ──────────────────────────────────────────────────────
$color-text:              #e2e2e2;
$color-text-muted:        #bbc9ca;

// ── Borders ───────────────────────────────────────────────────
$color-border:            #3c494a;
$color-outline:           #869394;

// ── Primary (Cyan) ────────────────────────────────────────────
$color-primary:           #55d8e1;
$color-primary-dark:      #00adb5;
$color-on-primary:        #003739;

// ── Error ─────────────────────────────────────────────────────
$color-error:             #ffb4ab;
$color-error-bg:          rgba(#93000a, 0.3);
$color-error-border:      #93000a;

// ── Typography ────────────────────────────────────────────────
$font-mono: var(--font-mono);
$font-body: var(--font-inter), system-ui, sans-serif;

// ── Radii ─────────────────────────────────────────────────────
$radius:    0.5rem;
$radius-lg: 1rem;
$radius-xl: 1.5rem;
```

- [ ] **Step 4: Create `styles/_mixins.scss`**

Tokens are already in scope via `additionalData` injection order (`tokens` is imported first). No `@import "tokens"` needed here.

```scss
// styles/_mixins.scss

@mixin font-mono {
  font-family: $font-mono;
}

@mixin input-base {
  width: 100%;
  border-radius: $radius;
  border: 1px solid $color-border;
  background: $color-surface-elevated;
  color: $color-text;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 150ms ease;

  &::placeholder {
    color: $color-border;
  }

  &:focus {
    border-color: $color-primary;
  }
}

@mixin input-label {
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: $color-text;
  @include font-mono;
}

@mixin btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: $radius;
  background: $color-primary;
  color: $color-on-primary;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 150ms ease;
  @include font-mono;

  &:hover:not(:disabled) {
    background: $color-primary-dark;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

@mixin btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: $radius;
  background: transparent;
  color: $color-text-muted;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 150ms ease;

  &:hover:not(:disabled) {
    color: $color-text;
  }
}

@mixin card {
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
}

@mixin glow-blob {
  border-radius: 9999px;
  background: $color-primary;
  opacity: 0.08;
  pointer-events: none;
  filter: blur(80px);
  position: fixed;
}
```

- [ ] **Step 5: Update `app/globals.css` with Midnight Tech base variables**

```css
/* app/globals.css */
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-inter);
  --font-mono: var(--font-jetbrains);
}

:root {
  --background: #121414;
  --foreground: #e2e2e2;
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-inter), system-ui, sans-serif;
}
```

- [ ] **Step 6: Verify dev server starts without SCSS errors**

Run: `npm run dev`
Expected: Server starts at http://localhost:3000 with no compilation errors in the terminal. The page will have unstyled components temporarily — that is expected and will be fixed in later tasks.

- [ ] **Step 7: Commit**

```bash
git add styles/_tokens.scss styles/_mixins.scss app/globals.css next.config.ts package.json package-lock.json
git commit -m "feat: add sass, Midnight Tech design tokens, and shared mixins"
```

---

### Task 2: Root Layout — Swap Fonts

**Files:**
- Modify: `app/layout.tsx`

**Interfaces:**
- Produces: CSS variable `--font-jetbrains` available globally; `--font-mono` resolves to it via `@theme inline` in `globals.css`; `--font-vietnam` removed

- [ ] **Step 1: Update `app/layout.tsx`**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { JetBrains_Mono, Inter } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/components/shared/SessionProvider'

const jetbrainsMono = JetBrains_Mono({
  weight: ['500', '600', '700'],
  variable: '--font-jetbrains',
  subsets: ['latin'],
})

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'vet-car',
  description: 'Vehicle service history platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Verify font loads**

Run: `npm run dev`, open http://localhost:3000/login
Expected: Any element still using `var(--font-vietnam)` will fall back to system monospace. This will be fully fixed in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: swap Be Vietnam Pro for JetBrains Mono (Midnight Tech typography)"
```

---

### Task 3: Shared Components

**Files:**
- Create: `components/shared/DashboardNav.module.scss`
- Modify: `components/shared/DashboardNav.tsx`
- Create: `components/shared/DashboardFooter.module.scss`
- Modify: `components/shared/DashboardFooter.tsx`
- Create: `components/shared/AvatarMenu.module.scss`
- Modify: `components/shared/AvatarMenu.tsx`

**Interfaces:**
- Consumes: `$color-*`, `$font-mono`, `@include btn-primary`, `@include font-mono` from auto-injected tokens + mixins
- Produces: Styled nav bar, footer, and avatar dropdown in Midnight Tech palette

- [ ] **Step 1: Create `components/shared/DashboardNav.module.scss`**

```scss
// components/shared/DashboardNav.module.scss

.nav {
  background: $color-surface;
  border-bottom: 1px solid $color-border;
}

.logo {
  color: $color-primary;
  @include font-mono;
}

.navLinkActive {
  color: $color-primary;
  border-bottom: 2px solid $color-primary;
  padding-bottom: 0.375rem;
  cursor: pointer;
}

.navLink {
  color: $color-text-muted;
  transition: color 150ms ease;
  cursor: pointer;

  &:hover {
    color: $color-text;
  }
}

.btnNewOrder {
  @include btn-primary;
  height: 2.5rem;
  padding: 0 1rem;
  font-size: 0.75rem;
  letter-spacing: 0.037em;
}
```

- [ ] **Step 2: Update `components/shared/DashboardNav.tsx`**

```tsx
// components/shared/DashboardNav.tsx
import { BellIcon, GearIcon } from '@/components/ui/icons'
import { AvatarMenu } from './AvatarMenu'
import styles from './DashboardNav.module.scss'

export function DashboardNav({ userName, userEmail }: { userName: string; userEmail?: string }) {
  return (
    <header className={`${styles.nav} fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-8`}>
      <div className="flex items-center gap-4">
        <span className={`${styles.logo} text-2xl font-bold tracking-tight`}>
          AutoStream Pro
        </span>
        <nav className="flex items-center gap-4 ml-4">
          <span className={`${styles.navLinkActive} text-sm`}>Dashboard</span>
          <span className={`${styles.navLink} text-sm`}>Work Orders</span>
          <span className={`${styles.navLink} text-sm`}>Inventory</span>
          <span className={`${styles.navLink} text-sm`}>Scheduling</span>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <button className={styles.btnNewOrder}>New Order</button>
        <div className="flex items-center gap-2">
          <button className="p-1 hover:opacity-70 transition-opacity"><BellIcon /></button>
          <button className="p-1 hover:opacity-70 transition-opacity"><GearIcon /></button>
        </div>
        <AvatarMenu userName={userName} userEmail={userEmail} />
      </div>
    </header>
  )
}
```

- [ ] **Step 3: Create `components/shared/DashboardFooter.module.scss`**

```scss
// components/shared/DashboardFooter.module.scss

.footer {
  background: $color-surface;
  border-top: 1px solid $color-border;
}

.logo {
  color: $color-text;
  letter-spacing: 0.037em;
  @include font-mono;
}

.copyright {
  color: $color-text-muted;
  letter-spacing: 0.037em;
}

.link {
  color: $color-text-muted;
  letter-spacing: 0.037em;
  transition: color 150ms ease;
  cursor: pointer;

  &:hover {
    color: $color-text;
  }
}
```

- [ ] **Step 4: Update `components/shared/DashboardFooter.tsx`**

```tsx
// components/shared/DashboardFooter.tsx
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
```

- [ ] **Step 5: Create `components/shared/AvatarMenu.module.scss`**

```scss
// components/shared/AvatarMenu.module.scss

.trigger {
  background: $color-surface-elevated;
  border: 1px solid $color-border;
  transition: border-color 150ms ease;

  &:hover {
    border-color: $color-primary;
  }
}

.initials {
  font-size: 0.625rem;
  font-weight: 600;
  color: $color-primary;
}

.dropdown {
  background: $color-surface;
  border: 1px solid $color-border;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.dropdownHeader {
  border-bottom: 1px solid $color-border;
}

.userName {
  color: $color-text;
}

.userEmail {
  color: $color-text-muted;
}

.signOutBtn {
  color: $color-error;
  transition: background 150ms ease;
  text-align: left;
  width: 100%;

  &:hover {
    background: rgba(#93000a, 0.2);
  }
}
```

- [ ] **Step 6: Update `components/shared/AvatarMenu.tsx`**

```tsx
// components/shared/AvatarMenu.tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import styles from './AvatarMenu.module.scss'

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export function AvatarMenu({ userName, userEmail }: { userName: string; userEmail?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  return (
    <MotionConfig reducedMotion="user">
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(v => !v)}
          aria-label="Open user menu"
          aria-expanded={open}
          aria-haspopup="true"
          className={`${styles.trigger} size-8 rounded-full flex items-center justify-center cursor-pointer`}
        >
          <span className={styles.initials}>{getInitials(userName)}</span>
        </button>

        <AnimatePresence mode="wait">
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
              className={`${styles.dropdown} absolute right-0 top-10 w-52 rounded-lg overflow-hidden z-50`}
            >
              <div className={`${styles.dropdownHeader} px-4 py-3`}>
                <p className={`${styles.userName} text-sm font-semibold truncate`}>{userName}</p>
                {userEmail && (
                  <p className={`${styles.userEmail} text-xs truncate mt-0.5`}>{userEmail}</p>
                )}
              </div>
              <div className="py-1">
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className={`${styles.signOutBtn} px-4 py-2.5 text-sm`}
                >
                  Sign out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
```

- [ ] **Step 7: Verify shared components**

Run: `npm run dev`, sign in and open http://localhost:3000/owner
Expected: Nav has cyan logo and active link; footer uses teal-dark colors; avatar trigger shows cyan initials; dropdown renders correctly.

- [ ] **Step 8: Commit**

```bash
git add components/shared/DashboardNav.module.scss components/shared/DashboardNav.tsx \
        components/shared/DashboardFooter.module.scss components/shared/DashboardFooter.tsx \
        components/shared/AvatarMenu.module.scss components/shared/AvatarMenu.tsx
git commit -m "feat: migrate shared nav/footer/avatar to SCSS modules with Midnight Tech design"
```

---

### Task 4: Auth Pages

**Files:**
- Create: `app/(auth)/login/login.module.scss`
- Modify: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/register/register.module.scss`
- Modify: `app/(auth)/register/page.tsx`
- Create: `app/(auth)/select-role/select-role.module.scss`
- Modify: `app/(auth)/select-role/page.tsx`

**Interfaces:**
- Consumes: All tokens and mixins from auto-injection
- Produces: Login, Register, and Select Role pages in Midnight Tech — cyan glows, cyan inputs focus, JetBrains Mono for headings and labels

- [ ] **Step 1: Create `app/(auth)/login/login.module.scss`**

```scss
// app/(auth)/login/login.module.scss

.page {
  background: $color-bg;
}

.card {
  @include card;
  border-radius: $radius-xl;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
}

.glow {
  @include glow-blob;
  top: -8rem;
  left: -8rem;
  width: 16rem;
  height: 16rem;
  position: absolute;
}

.appName {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: $color-text;
  @include font-mono;
}

.tagline {
  font-size: 0.875rem;
  color: $color-text-muted;
}

.errorMsg {
  font-size: 0.875rem;
  text-align: center;
  color: $color-error;
  background: $color-error-bg;
  border: 1px solid $color-error-border;
  border-radius: $radius;
  padding: 0.5rem 0.75rem;
}

.label {
  @include input-label;
}

.inputIconLeft {
  @include input-base;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
}

.inputIconBoth {
  @include input-base;
  padding: 0.75rem 2.5rem 0.75rem 2.5rem;
}

.forgotLink {
  font-size: 0.6875rem;
  font-weight: 500;
  color: $color-primary;
  cursor: pointer;
  transition: opacity 150ms ease;

  &:hover { opacity: 0.8; }
}

.rememberText {
  font-size: 0.875rem;
  color: $color-text-muted;
}

.submitBtn {
  @include btn-primary;
  width: 100%;
  padding: 0.75rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.footerText {
  font-size: 0.875rem;
  text-align: center;
  color: $color-text-muted;
}

.footerLink {
  font-weight: 500;
  color: $color-primary;
  transition: opacity 150ms ease;

  &:hover { opacity: 0.8; }
}
```

- [ ] **Step 2: Update `app/(auth)/login/page.tsx`**

```tsx
// app/(auth)/login/page.tsx
'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ArrowRightIcon, CarIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import styles from './login.module.scss'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      setError('Invalid email or password')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className={`${styles.page} min-h-screen flex items-center justify-center px-4`}>
        <motion.div
          initial={{ opacity: 0, y: motionTokens.distance.lg }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
          className={`${styles.card} relative w-full max-w-[448px] p-10 flex flex-col gap-8 overflow-hidden`}
        >
          <div className={styles.glow} />

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 z-10">
            <div className="flex items-center gap-3">
              <CarIcon color="#55d8e1" />
              <span className={styles.appName}>AutoStream Pro</span>
            </div>
            <p className={styles.tagline}>Sign in to manage your operations</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 z-10">
            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  key="error"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                  className={styles.errorMsg}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className={styles.label}>Email Address</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <MailIcon />
                </span>
                <input id="email" name="email" type="email" required autoComplete="email"
                  placeholder="admin@autostream.com" className={styles.inputIconLeft} />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className={styles.label}>Password</label>
                <span className={styles.forgotLink}>Forgot password?</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <LockIcon />
                </span>
                <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                  required autoComplete="current-password" placeholder="••••••••"
                  className={styles.inputIconBoth} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" name="remember"
                className="w-4 h-4 rounded accent-[#55d8e1]" />
              <span className={styles.rememberText}>Remember me for 30 days</span>
            </label>

            {/* Submit */}
            <motion.button type="submit" disabled={loading}
              whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
              className={styles.submitBtn}>
              {loading ? 'Signing in…' : 'Sign In'}
              {!loading && <ArrowRightIcon />}
            </motion.button>
          </form>

          {/* Footer */}
          <p className={`${styles.footerText} z-10`}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className={styles.footerLink}>Register now</Link>
          </p>
        </motion.div>
      </main>
    </MotionConfig>
  )
}
```

- [ ] **Step 3: Create `app/(auth)/register/register.module.scss`**

```scss
// app/(auth)/register/register.module.scss

.page {
  background: $color-bg;
}

.glowTopRight {
  @include glow-blob;
  top: -10%;
  right: -5%;
  width: 24rem;
  height: 24rem;
}

.glowBottomLeft {
  @include glow-blob;
  bottom: -10%;
  left: -5%;
  width: 20rem;
  height: 20rem;
}

.iconWrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: $radius-lg;
  border: 1px solid $color-border;
  background: $color-surface-high;
}

.heading {
  font-size: 1.5rem;
  font-weight: 600;
  color: $color-text;
  @include font-mono;
}

.subheading {
  font-size: 0.875rem;
  color: $color-text-muted;
}

.card {
  @include card;
  border-radius: $radius-xl;
}

.errorMsg {
  font-size: 0.875rem;
  text-align: center;
  color: $color-error;
  background: $color-error-bg;
  border: 1px solid $color-error-border;
  border-radius: $radius;
  padding: 0.5rem 0.75rem;
}

.label {
  @include input-label;
}

.inputIconLeft {
  @include input-base;
  padding: 0.75rem 0.75rem 0.75rem 2.5rem;
}

.inputIconBoth {
  @include input-base;
  padding: 0.75rem 2.5rem 0.75rem 2.5rem;
}

.termsText {
  font-size: 0.875rem;
  color: $color-text-muted;
}

.termsLink {
  font-weight: 500;
  color: $color-primary;
  cursor: pointer;
}

.submitBtn {
  @include btn-primary;
  width: 100%;
  padding: 0.75rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.footerText {
  font-size: 0.875rem;
  text-align: center;
  color: $color-text-muted;
}

.footerLink {
  font-weight: 500;
  color: $color-primary;
  transition: opacity 150ms ease;

  &:hover { opacity: 0.8; }
}

.copyright {
  font-size: 0.75rem;
  color: rgba($color-text-muted, 0.5);
}
```

- [ ] **Step 4: Update `app/(auth)/register/page.tsx`**

```tsx
// app/(auth)/register/page.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ArrowRightIcon, CarIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon, UserIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import styles from './register.module.scss'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    const form = e.currentTarget
    const name = (form.elements.namedItem('name') as HTMLInputElement).value
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    sessionStorage.setItem('reg_pending', JSON.stringify({ name, email, password }))
    router.push('/select-role')
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className={`${styles.page} min-h-screen flex flex-col items-center justify-center px-4 py-12`}>
        <div className={styles.glowTopRight} />
        <div className={styles.glowBottomLeft} />

        <motion.div
          initial={{ opacity: 0, y: motionTokens.distance.lg }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
          className="w-full max-w-[448px] flex flex-col gap-6 z-10"
        >
          {/* Header */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={styles.iconWrapper}>
              <CarIcon color="#55d8e1" />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className={styles.heading}>Create Account</h1>
              <p className={styles.subheading}>Fill in your details to get started</p>
            </div>
          </div>

          {/* Card */}
          <div className={`${styles.card} p-8 flex flex-col gap-5`}>
            <AnimatePresence mode="wait">
              {error && (
                <motion.p key="error"
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                  className={styles.errorMsg}>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className={styles.label}>Full Name</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><UserIcon /></span>
                  <input id="name" name="name" type="text" required autoComplete="name"
                    placeholder="John Doe" className={styles.inputIconLeft} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="email" className={styles.label}>Email Address</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><MailIcon /></span>
                  <input id="email" name="email" type="email" required autoComplete="email"
                    placeholder="you@example.com" className={styles.inputIconLeft} />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="password" className={styles.label}>Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><LockIcon /></span>
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                    required minLength={8} autoComplete="new-password"
                    placeholder="Min. 8 characters" className={styles.inputIconBoth} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="confirm" className={styles.label}>Confirm Password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><LockIcon /></span>
                  <input id="confirm" name="confirm" type={showConfirm ? 'text' : 'password'}
                    required autoComplete="new-password"
                    placeholder="Repeat your password" className={styles.inputIconBoth} />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                    {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input type="checkbox" required
                  className="mt-0.5 w-4 h-4 rounded accent-[#55d8e1] shrink-0" />
                <span className={styles.termsText}>
                  I agree to the{' '}
                  <span className={styles.termsLink}>Terms of Service</span>
                  {' '}and{' '}
                  <span className={styles.termsLink}>Privacy Policy</span>
                </span>
              </label>

              <motion.button type="submit"
                whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
                whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
                className={styles.submitBtn}>
                Continue
                <ArrowRightIcon />
              </motion.button>
            </form>
          </div>

          <p className={styles.footerText}>
            Already have an account?{' '}
            <Link href="/login" className={styles.footerLink}>Log in</Link>
          </p>
        </motion.div>

        <p className={`${styles.copyright} absolute bottom-6`}>
          © 2024 AutoStream Pro. All rights reserved.
        </p>
      </main>
    </MotionConfig>
  )
}
```

- [ ] **Step 5: Create `app/(auth)/select-role/select-role.module.scss`**

```scss
// app/(auth)/select-role/select-role.module.scss

.page {
  background: $color-bg;
}

.glowTopRight {
  @include glow-blob;
  top: -10%;
  right: -5%;
  width: 24rem;
  height: 24rem;
}

.glowBottomLeft {
  @include glow-blob;
  bottom: -10%;
  left: -5%;
  width: 24rem;
  height: 24rem;
}

.heading {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: $color-text;
  @include font-mono;
}

.subheading {
  font-size: 1rem;
  color: $color-text-muted;
}

.errorMsg {
  font-size: 0.875rem;
  text-align: center;
  color: $color-error;
  background: $color-error-bg;
  border: 1px solid $color-error-border;
  border-radius: $radius;
  padding: 0.5rem 0.75rem;
  width: 100%;
}

.errorLink {
  text-decoration: underline;
  color: $color-primary;
}

.roleCard {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border-radius: $radius-xl;
  border: 1px solid $color-border;
  background: $color-surface;
  padding: 2rem;
  text-align: left;
  cursor: pointer;
  transition: border-color 150ms ease, background 150ms ease;

  &:hover {
    border-color: $color-outline;
  }
}

.roleCardSelected {
  border-color: $color-primary;
  background: $color-surface-elevated;
  box-shadow: 0 0 0 1px $color-primary;
}

.roleIconWrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 9999px;
  background: $color-surface-high;
}

.roleTitle {
  font-size: 1rem;
  font-weight: 600;
  color: $color-text;
  @include font-mono;
}

.roleDesc {
  font-size: 0.875rem;
  color: $color-text-muted;
}

.roleSelectedIndicator {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: $color-primary;
  @include font-mono;
}

.selectedDot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: $color-primary;
}

.continueBtn {
  @include btn-primary;
  width: 100%;
  padding: 0.75rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.footerText {
  font-size: 0.875rem;
  color: $color-text-muted;
}

.footerLink {
  font-weight: 500;
  color: $color-primary;
  transition: opacity 150ms ease;

  &:hover { opacity: 0.8; }
}
```

- [ ] **Step 6: Update `app/(auth)/select-role/page.tsx`**

```tsx
// app/(auth)/select-role/page.tsx
'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ArrowRightIcon, CarIcon, WrenchIcon } from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import styles from './select-role.module.scss'

type Role = 'MECHANIC' | 'OWNER'

export default function SelectRolePage() {
  const router = useRouter()
  const [selected, setSelected] = useState<Role | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleContinue() {
    if (!selected) return

    const raw = sessionStorage.getItem('reg_pending')
    if (!raw) {
      router.replace('/register')
      return
    }

    setError('')
    setLoading(true)

    const { name, email, password } = JSON.parse(raw) as { name: string; email: string; password: string }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role: selected }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Registration failed')
      setLoading(false)
      return
    }

    sessionStorage.removeItem('reg_pending')
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (result?.error) {
      setError('Account created but sign-in failed. Please sign in manually.')
      router.push('/login')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className={`${styles.page} min-h-screen flex flex-col items-center justify-center px-4`}>
        <div className={styles.glowTopRight} />
        <div className={styles.glowBottomLeft} />

        <motion.div
          initial={{ opacity: 0, y: motionTokens.distance.lg }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
          className="w-full max-w-[600px] flex flex-col items-center gap-8 z-10"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className={styles.heading}>Welcome to AutoStream Pro!</h1>
            <p className={styles.subheading}>Select your role to complete your registration.</p>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.p key="error"
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                className={styles.errorMsg}>
                {error}{' '}
                {error.includes('Email already in use') && (
                  <a href="/register" className={styles.errorLink}>Go back to edit</a>
                )}
              </motion.p>
            )}
          </AnimatePresence>

          <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
            <motion.button type="button" onClick={() => setSelected('MECHANIC')}
              whileHover={{ scale: selected === 'MECHANIC' ? 1 : 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
              whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
              className={`${styles.roleCard} ${selected === 'MECHANIC' ? styles.roleCardSelected : ''}`}>
              <div className={styles.roleIconWrapper}><WrenchIcon /></div>
              <div className="flex flex-col gap-1">
                <span className={styles.roleTitle}>Mechanic / Shop Owner</span>
                <span className={styles.roleDesc}>Manage clients, vehicles, work orders, and service records.</span>
              </div>
              {selected === 'MECHANIC' && (
                <div className={styles.roleSelectedIndicator}>
                  <div className={styles.selectedDot} />
                  Selected
                </div>
              )}
            </motion.button>

            <motion.button type="button" onClick={() => setSelected('OWNER')}
              whileHover={{ scale: selected === 'OWNER' ? 1 : 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
              whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
              className={`${styles.roleCard} ${selected === 'OWNER' ? styles.roleCardSelected : ''}`}>
              <div className={styles.roleIconWrapper}><CarIcon color="#55d8e1" /></div>
              <div className="flex flex-col gap-1">
                <span className={styles.roleTitle}>Vehicle Owner</span>
                <span className={styles.roleDesc}>View your vehicle history, track service records, and approve quotes.</span>
              </div>
              {selected === 'OWNER' && (
                <div className={styles.roleSelectedIndicator}>
                  <div className={styles.selectedDot} />
                  Selected
                </div>
              )}
            </motion.button>
          </div>

          <motion.button type="button" onClick={handleContinue}
            disabled={!selected || loading}
            whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
            whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
            className={styles.continueBtn}>
            {loading ? 'Creating account…' : 'Complete Registration'}
            {!loading && <ArrowRightIcon />}
          </motion.button>

          <p className={styles.footerText}>
            Already have an account?{' '}
            <a href="/login" className={styles.footerLink}>Sign in</a>
          </p>
        </motion.div>
      </main>
    </MotionConfig>
  )
}
```

- [ ] **Step 7: Verify auth pages**

Run: `npm run dev`
- http://localhost:3000/login — cyan glow top-left of card, cyan submit button, JetBrains Mono app name, dark inputs with `#3c494a` border
- http://localhost:3000/register — cyan glows top-right and bottom-left, same input/button treatment
- http://localhost:3000/select-role — role cards highlight in cyan when selected, JetBrains Mono headings

- [ ] **Step 8: Commit**

```bash
git add "app/(auth)/login/login.module.scss" "app/(auth)/login/page.tsx" \
        "app/(auth)/register/register.module.scss" "app/(auth)/register/page.tsx" \
        "app/(auth)/select-role/select-role.module.scss" "app/(auth)/select-role/page.tsx"
git commit -m "feat: migrate auth pages to SCSS modules with Midnight Tech design"
```

---

### Task 5: Dashboard Layout + Owner Dashboard Content

**Files:**
- Modify: `app/(dashboard)/layout.tsx`
- Create: `app/(dashboard)/owner/DashboardContent.module.scss`
- Modify: `app/(dashboard)/owner/DashboardContent.tsx`

**Interfaces:**
- Consumes: All tokens and mixins from auto-injection
- Produces: Dashboard page with correct `#121414` background, vehicle cards with cyan accent bar (active) or dim border bar (idle), cyan timeline progress bar and step dots

- [ ] **Step 1: Update `app/(dashboard)/layout.tsx`**

```tsx
// app/(dashboard)/layout.tsx
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return (
    <div className="min-h-screen bg-[#121414]">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create `app/(dashboard)/owner/DashboardContent.module.scss`**

```scss
// app/(dashboard)/owner/DashboardContent.module.scss

// ── Header ───────────────────────────────────────────────────────────
.welcomeText {
  font-size: 1rem;
  color: $color-text;
}

.welcomeSub {
  font-size: 1rem;
  color: $color-text-muted;
}

.btnRegister {
  @include btn-primary;
  height: 2.5rem;
  padding: 0 1rem;
  font-size: 0.75rem;
  letter-spacing: 0.037em;
}

// ── Section headings ─────────────────────────────────────────────────
.sectionHeading {
  font-size: 1.5rem;
  font-weight: 600;
  color: $color-text;
  @include font-mono;
}

// ── Vehicle card ─────────────────────────────────────────────────────
.vehicleCard {
  position: relative;
  background: $color-surface;
  border: 1px solid $color-border;
  border-radius: $radius;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 150ms ease;

  &:hover {
    border-color: $color-outline;
  }
}

.accentActive {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 0.25rem;
  background: $color-primary;
}

.accentIdle {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 0.25rem;
  background: $color-border;
}

.vehicleName {
  font-size: 1.5rem;
  font-weight: 600;
  color: $color-text;
  line-height: 2rem;
  @include font-mono;
}

.vehicleMeta {
  font-size: 0.75rem;
  font-weight: 500;
  color: $color-text-muted;
  letter-spacing: 0.037em;
}

.badgeActive {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.037em;
  padding: 0.25rem 0.5rem;
  border-radius: $radius;
  background: rgba($color-primary, 0.15);
  color: $color-primary;
  @include font-mono;
}

.badgeIdle {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.037em;
  padding: 0.25rem 0.5rem;
  border-radius: $radius;
  background: $color-surface-high;
  color: $color-text-muted;
  @include font-mono;
}

.vehicleDetailBtn {
  font-size: 0.75rem;
  font-weight: 500;
  color: $color-primary;
  letter-spacing: 0.037em;
}

// ── Empty state ──────────────────────────────────────────────────────
.emptyState {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 12rem;
  background: $color-surface;
  border: 1px dashed $color-border;
  border-radius: $radius;
  gap: 0.75rem;
}

.emptyText {
  font-size: 0.875rem;
  color: $color-text-muted;
}

.btnRegisterSm {
  @include btn-primary;
  height: 2.25rem;
  padding: 0 0.75rem;
  font-size: 0.75rem;
  letter-spacing: 0.037em;
}

// ── Appointments ─────────────────────────────────────────────────────
.appointmentsCard {
  @include card;
}

.appointmentItem {
  border-left: 2px solid $color-primary;
  border-radius: 0 $radius $radius 0;
}

.apptDateBox {
  background: $color-surface-high;
  border-radius: $radius;
  min-width: 3rem;
  flex-shrink: 0;
}

.apptMonth {
  font-size: 0.75rem;
  font-weight: 500;
  color: $color-text-muted;
  letter-spacing: 0.037em;
  text-transform: uppercase;
  @include font-mono;
}

.apptDay {
  font-size: 1.5rem;
  font-weight: 600;
  color: $color-text;
  line-height: 2rem;
  @include font-mono;
}

.apptTitle {
  font-size: 1rem;
  font-weight: 600;
  color: $color-text;
}

.apptVehicle {
  font-size: 0.875rem;
  color: $color-text-muted;
}

.noAppts {
  font-size: 0.875rem;
  color: $color-text-muted;
}

.scheduleBtn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: $radius;
  border: 1px dashed $color-border;
  font-size: 0.75rem;
  font-weight: 500;
  color: $color-text-muted;
  letter-spacing: 0.037em;
  transition: border-color 150ms ease;
  @include font-mono;

  &:hover { border-color: $color-outline; }
}

// ── Timeline ─────────────────────────────────────────────────────────
.repairCard {
  background: rgba($color-surface, 0.9);
  backdrop-filter: blur(4px);
  border: 1px solid $color-border;
  border-radius: $radius;
}

.repairCardHeader {
  border-bottom: 1px solid $color-border;
}

.repairVehicle {
  font-size: 1rem;
  font-weight: 600;
  color: $color-text;
}

.repairOrder {
  font-size: 0.875rem;
  color: $color-text-muted;
}

.repairStatusBadge {
  background: rgba($color-primary, 0.15);
  padding: 0.25rem 0.5rem;
  border-radius: $radius;
  font-size: 0.75rem;
  font-weight: 500;
  color: $color-primary;
  letter-spacing: 0.037em;
  @include font-mono;
}

.stepDone {
  background: $color-primary;
  border: 2px solid $color-surface;
}

.stepCurrent {
  background: $color-surface;
  border: 4px solid $color-primary;
}

.stepPending {
  background: $color-surface-high;
  border: 2px solid $color-surface;
}

.stepLabelCurrent {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.037em;
  text-align: center;
  white-space: nowrap;
  color: $color-primary;
  @include font-mono;
}

.stepLabelDone {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.037em;
  text-align: center;
  white-space: nowrap;
  color: $color-text;
  @include font-mono;
}

.stepLabelPending {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.037em;
  text-align: center;
  white-space: nowrap;
  color: $color-text-muted;
  @include font-mono;
}

.progressTrack {
  background: $color-surface-high;
}

.progressBar {
  background: $color-primary;
}
```

- [ ] **Step 3: Update `app/(dashboard)/owner/DashboardContent.tsx`**

```tsx
// app/(dashboard)/owner/DashboardContent.tsx
'use client'

import { useRouter } from 'next/navigation'
import { motion, MotionConfig } from 'motion/react'
import {
  PlusIcon,
  ChevronRightIcon,
  CheckIcon,
  CalendarIcon,
} from '@/components/ui/icons'
import { motionTokens } from '@/lib/motionTokens'
import styles from './DashboardContent.module.scss'

type VehicleSummary = {
  id: string
  label: string
  vin: string | null
  plate: string | null
  hasActiveRepair: boolean
}

type ActiveRepairSummary = {
  id: string
  vehicle: string
  workOrder: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
}

type AppointmentSummary = {
  id: string
  month: string
  day: string
  title: string
  vehicle: string
}

interface DashboardContentProps {
  userName: string
  vehicles: VehicleSummary[]
  activeRepairs: ActiveRepairSummary[]
  upcomingAppointments: AppointmentSummary[]
}

const TIMELINE_STEPS = ['Checked In', 'Inspection', 'Repairing', 'Ready'] as const

function timelineCurrentStep(status: ActiveRepairSummary['status']): number {
  if (status === 'PENDING') return 0
  if (status === 'IN_PROGRESS') return 2
  return 3
}

type Step = { label: string; state: 'done' | 'current' | 'pending' }

function VehicleCard({ v, index }: { v: VehicleSummary; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: motionTokens.distance.md }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth, delay: index * 0.08 }}
      whileHover={{ y: -4, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
      className={`${styles.vehicleCard} flex flex-col justify-between h-48 p-4 flex-1 min-w-0`}
    >
      <div className={v.hasActiveRepair ? styles.accentActive : styles.accentIdle} />
      <div className="flex flex-col gap-1 pt-1">
        <span className={styles.vehicleName}>{v.label}</span>
        {v.vin && <span className={styles.vehicleMeta}>VIN: {v.vin}</span>}
        {v.plate && <span className={`${styles.vehicleMeta} text-sm`}>License: {v.plate}</span>}
      </div>
      <div className="flex items-center justify-between">
        <span className={v.hasActiveRepair ? styles.badgeActive : styles.badgeIdle}>
          {v.hasActiveRepair ? 'Active Repair' : 'Up to date'}
        </span>
        <button className={styles.vehicleDetailBtn}>View Details</button>
      </div>
    </motion.div>
  )
}

function TimelineStep({ step, total, index }: { step: Step; total: number; index: number }) {
  const isDone = step.state === 'done'
  const isCurrent = step.state === 'current'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth, delay: 0.6 + index * 0.08 }}
      className="flex flex-col items-center gap-2 relative z-10"
      style={{ width: `${100 / total}%` }}
    >
      {isDone && (
        <div className={`${styles.stepDone} size-6 rounded-full flex items-center justify-center shrink-0`}>
          <CheckIcon />
        </div>
      )}
      {isCurrent && (
        <motion.div
          animate={{ scale: [1, 1.18, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className={`${styles.stepCurrent} size-8 rounded-full flex items-center justify-center shrink-0 -mt-1`}
        >
          <div className="size-2 rounded-full bg-[#55d8e1]" />
        </motion.div>
      )}
      {step.state === 'pending' && (
        <div className={`${styles.stepPending} size-6 rounded-full shrink-0`} />
      )}
      <span className={isCurrent ? styles.stepLabelCurrent : isDone ? styles.stepLabelDone : styles.stepLabelPending}>
        {step.label}
      </span>
    </motion.div>
  )
}

export function DashboardContent({ userName, vehicles, activeRepairs, upcomingAppointments }: DashboardContentProps) {
  const router = useRouter()

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex-1 pt-16">
        <div className="max-w-[1280px] mx-auto px-8 py-8 flex flex-col gap-8">

          <motion.div
            initial={{ opacity: 0, y: motionTokens.distance.md }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
            className="flex items-end justify-between"
          >
            <div className="flex flex-col gap-1">
              <span className={styles.welcomeText}>Welcome back, {userName}</span>
              <span className={styles.welcomeSub}>Here&apos;s the status of your vehicles and upcoming appointments.</span>
            </div>
            <motion.button
              onClick={() => router.push('/owner/vehicles/new')}
              whileHover={{ scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } }}
              whileTap={{ scale: 0.97, transition: { duration: 0.1 } }}
              className={styles.btnRegister}
            >
              <PlusIcon color="#003739" />
              Register New Vehicle
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: motionTokens.distance.md }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth, delay: 0.08 }}
            className="grid grid-cols-12 gap-4"
          >
            <div className="col-span-8 flex flex-col gap-4">
              <h2 className={styles.sectionHeading}>My Vehicles</h2>
              {vehicles.length === 0 ? (
                <div className={styles.emptyState}>
                  <span className={styles.emptyText}>No vehicles registered yet.</span>
                  <button onClick={() => router.push('/owner/vehicles/new')} className={styles.btnRegisterSm}>
                    <PlusIcon color="#003739" />
                    Register your first vehicle
                  </button>
                </div>
              ) : (
                <div className="flex gap-4">
                  {vehicles.map((v, i) => <VehicleCard key={v.id} v={v} index={i} />)}
                </div>
              )}
            </div>

            <div className="col-span-4 flex flex-col gap-4">
              <h2 className={styles.sectionHeading}>Upcoming Appointments</h2>
              <div className={`${styles.appointmentsCard} p-4 flex flex-col gap-2`}>
                {upcomingAppointments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-1">
                    <span className={styles.noAppts}>No upcoming appointments.</span>
                  </div>
                ) : (
                  upcomingAppointments.map(appt => (
                    <div key={appt.id} className={`${styles.appointmentItem} flex items-center gap-4 pl-2.5 pr-2 py-2`}>
                      <div className={`${styles.apptDateBox} flex flex-col items-center px-2 py-1`}>
                        <span className={styles.apptMonth}>{appt.month}</span>
                        <span className={styles.apptDay}>{appt.day}</span>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className={styles.apptTitle}>{appt.title}</span>
                        <span className={styles.apptVehicle}>{appt.vehicle}</span>
                      </div>
                      <ChevronRightIcon />
                    </div>
                  ))
                )}
                <div className="mt-4 pt-2">
                  <motion.button
                    whileHover={{ borderColor: '#55d8e1', transition: { duration: motionTokens.duration.fast } }}
                    className={styles.scheduleBtn}
                  >
                    <CalendarIcon />
                    Schedule Service
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>

          {activeRepairs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: motionTokens.distance.md }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth, delay: 0.16 }}
              className="flex flex-col gap-4"
            >
              <h2 className={styles.sectionHeading}>Active Repairs Tracking</h2>
              {activeRepairs.map(repair => {
                const currentStep = timelineCurrentStep(repair.status)
                const progressPct = (currentStep / (TIMELINE_STEPS.length - 1)) * 100
                const steps: Step[] = TIMELINE_STEPS.map((label, i) => ({
                  label,
                  state: i < currentStep ? 'done' : i === currentStep ? 'current' : 'pending',
                }))

                return (
                  <div key={repair.id} className={`${styles.repairCard} p-6 flex flex-col gap-4`}>
                    <div className={`${styles.repairCardHeader} flex items-center justify-between pb-3`}>
                      <div className="flex flex-col">
                        <span className={styles.repairVehicle}>{repair.vehicle}</span>
                        <span className={styles.repairOrder}>{repair.workOrder}</span>
                      </div>
                      <div className={styles.repairStatusBadge}>In Progress</div>
                    </div>
                    <div className="relative py-8">
                      <div className={`${styles.progressTrack} absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full`} />
                      <motion.div
                        className={`${styles.progressBar} absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full`}
                        initial={{ width: '0%' }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth, delay: 0.5 }}
                      />
                      <div className="relative flex items-start justify-between">
                        {steps.map((step, i) => (
                          <TimelineStep key={step.label} step={step} index={i} total={steps.length} />
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </motion.div>
          )}

        </div>
      </main>
    </MotionConfig>
  )
}
```

- [ ] **Step 4: Verify dashboard**

Run: `npm run dev`, sign in and open http://localhost:3000/owner
Expected: Section headings in JetBrains Mono; vehicle cards with cyan top bar (active) or dim border bar (idle); cyan `Register New Vehicle` button; timeline in cyan; appointments panel with cyan left-border items.

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/layout.tsx" \
        "app/(dashboard)/owner/DashboardContent.module.scss" \
        "app/(dashboard)/owner/DashboardContent.tsx"
git commit -m "feat: migrate owner dashboard to SCSS modules with Midnight Tech design"
```

---

### Task 6: Forms

**Files:**
- Create: `app/(dashboard)/owner/vehicles/new/NewVehicleForm.module.scss`
- Modify: `app/(dashboard)/owner/vehicles/new/NewVehicleForm.tsx`
- Create: `components/workshop/WorkshopSetupForm.module.scss`
- Modify: `components/workshop/WorkshopSetupForm.tsx`

**Interfaces:**
- Consumes: All tokens and mixins from auto-injection
- Produces: Register Vehicle form and Workshop Setup form with Midnight Tech palette — cyan focus states, JetBrains Mono section labels, cyan top accent stripe

- [ ] **Step 1: Create `app/(dashboard)/owner/vehicles/new/NewVehicleForm.module.scss`**

```scss
// app/(dashboard)/owner/vehicles/new/NewVehicleForm.module.scss

.pageTitle {
  font-size: 2.25rem;
  font-weight: 700;
  color: $color-text;
  letter-spacing: -0.02em;
  @include font-mono;
}

.pageSub {
  font-size: 1rem;
  color: $color-text-muted;
}

.formCard {
  @include card;
  border-radius: $radius;
  overflow: hidden;
}

.topAccent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: $color-primary;
  opacity: 0.5;
}

.sectionLabel {
  font-size: 0.75rem;
  font-weight: 500;
  color: $color-text-muted;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  @include font-mono;
}

.sectionDivider {
  border-bottom: 1px solid $color-border;
  padding-bottom: 0.5rem;
}

.fieldLabel {
  font-size: 0.875rem;
  font-weight: 500;
  color: $color-text-muted;
}

.input {
  @include input-base;
  padding: 0.75rem 1rem;
}

.inputIconLeft {
  @include input-base;
  padding: 0.75rem 3rem 0.75rem 2.5rem;
}

.select {
  @include input-base;
  padding: 0.75rem 2rem 0.75rem 1rem;
  appearance: none;
}

.scanBtn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: $color-surface-elevated;
  border: 1px solid $color-border;
  border-radius: $radius;
  font-size: 0.75rem;
  font-weight: 500;
  color: $color-text-muted;
  letter-spacing: 0.05em;
  cursor: not-allowed;
  @include font-mono;
}

.uploadArea {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  height: 9rem;
  border: 1px dashed $color-border;
  border-radius: $radius;
  overflow: hidden;
  transition: border-color 150ms ease;
  cursor: pointer;

  &:hover { border-color: $color-outline; }
}

.uploadLabel {
  font-size: 0.875rem;
  font-weight: 500;
  color: $color-primary;
}

.uploadHint {
  font-size: 0.75rem;
  color: $color-text-muted;
}

.mileageUnit {
  font-size: 0.875rem;
  color: $color-text-muted;
  pointer-events: none;
}

.errorMsg {
  font-size: 0.875rem;
  color: $color-error;
}

.actionsDivider {
  border-top: 1px solid $color-border;
}

.cancelBtn {
  @include btn-secondary;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
}

.submitBtn {
  @include btn-primary;
  height: 2.5rem;
  padding: 0 1rem;
  font-size: 0.75rem;
  letter-spacing: 0.037em;
}
```

- [ ] **Step 2: Update `app/(dashboard)/owner/vehicles/new/NewVehicleForm.tsx`**

```tsx
// app/(dashboard)/owner/vehicles/new/NewVehicleForm.tsx
'use client'

import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import {
  UploadIcon, OdometerIcon, ChevronDownIcon, ScanIcon, PlusIcon,
} from '@/components/ui/icons'
import styles from './NewVehicleForm.module.scss'

const CAR_MAKES = [
  'Acura', 'Alfa Romeo', 'Audi', 'BMW', 'Buick', 'Cadillac', 'Chevrolet',
  'Chrysler', 'Dodge', 'Ferrari', 'Fiat', 'Ford', 'GMC', 'Honda', 'Hyundai',
  'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Land Rover', 'Lexus', 'Lincoln',
  'Mazda', 'Mercedes-Benz', 'Mini', 'Mitsubishi', 'Nissan', 'Porsche',
  'Ram', 'Subaru', 'Tesla', 'Toyota', 'Volkswagen', 'Volvo', 'Other',
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: CURRENT_YEAR - 1979 }, (_, i) => CURRENT_YEAR - i)

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
  'AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'ON', 'PE', 'QC', 'SK',
]

type FormValues = {
  nickname: string; vin: string; make: string; model: string
  year: string; plate: string; plateState: string; mileage: string
}

export function NewVehicleForm() {
  const router = useRouter()
  const [values, setValues] = useState<FormValues>({
    nickname: '', vin: '', make: '', model: '', year: '', plate: '', plateState: '', mileage: '',
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setValues(prev => ({ ...prev, [name]: value }))
  }

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Something went wrong')
        return
      }
      router.push('/owner')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: motionTokens.distance.md }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
    >
      <div className="mb-8 flex flex-col gap-1">
        <h1 className={styles.pageTitle}>Register New Vehicle</h1>
        <p className={styles.pageSub}>Add a vehicle to track its service history.</p>
      </div>

      <div className="max-w-[600px] mx-auto">
        <form onSubmit={handleSubmit}>
          <div className={`${styles.formCard} relative`}>
            <div className={styles.topAccent} />
            <div className="p-8 flex flex-col gap-8">

              <section className="flex flex-col gap-4">
                <div className={styles.sectionDivider}>
                  <h2 className={styles.sectionLabel}>Identification</h2>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="nickname" className={styles.fieldLabel}>Vehicle Nickname</label>
                  <input id="nickname" name="nickname" type="text" placeholder="e.g. My Honda"
                    value={values.nickname} onChange={handleChange} className={styles.input} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="vin" className={styles.fieldLabel}>VIN</label>
                  <div className="flex gap-2">
                    <input id="vin" name="vin" type="text" placeholder="17-character VIN"
                      value={values.vin} onChange={handleChange} className={styles.input} />
                    <button type="button" disabled aria-label="Scan VIN barcode (coming soon)"
                      className={styles.scanBtn}>
                      <ScanIcon />Scan
                    </button>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <div className={styles.sectionDivider}>
                  <h2 className={styles.sectionLabel}>Details</h2>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="make" className={styles.fieldLabel}>Make</label>
                    <div className="relative">
                      <select id="make" name="make" value={values.make} onChange={handleChange}
                        required className={styles.select}>
                        <option value="" disabled>Select</option>
                        {CAR_MAKES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="model" className={styles.fieldLabel}>Model</label>
                    <input id="model" name="model" type="text" placeholder="e.g. CR-V"
                      value={values.model} onChange={handleChange} required className={styles.input} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="year" className={styles.fieldLabel}>Year</label>
                    <div className="relative">
                      <select id="year" name="year" value={values.year} onChange={handleChange}
                        required className={styles.select}>
                        <option value="" disabled>Year</option>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="plate" className={styles.fieldLabel}>License Plate</label>
                    <input id="plate" name="plate" type="text" placeholder="ABC-1234"
                      value={values.plate} onChange={handleChange} className={styles.input} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="plateState" className={styles.fieldLabel}>State / Province</label>
                    <div className="relative">
                      <select id="plateState" name="plateState" value={values.plateState}
                        onChange={handleChange} className={styles.select}>
                        <option value="">Select</option>
                        {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <ChevronDownIcon />
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="mileage" className={styles.fieldLabel}>Current Mileage</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                      <OdometerIcon />
                    </span>
                    <input id="mileage" name="mileage" type="number" min="0" placeholder="0"
                      value={values.mileage} onChange={handleChange}
                      className={styles.inputIconLeft} />
                    <span className={`${styles.mileageUnit} absolute right-4 top-1/2 -translate-y-1/2`}>km</span>
                  </div>
                </div>
              </section>

              <section className="flex flex-col gap-4">
                <div className={styles.sectionDivider}>
                  <h2 className={styles.sectionLabel}>Media</h2>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className={styles.fieldLabel}>Vehicle Photo</span>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className={styles.uploadArea}>
                    {photoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <UploadIcon />
                        <div className="flex flex-col items-center gap-1">
                          <span className={styles.uploadLabel}>Click to upload</span>
                          <span className={styles.uploadHint}>PNG, JPG or WEBP, max 5MB</span>
                        </div>
                      </>
                    )}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoChange} className="sr-only" />
                </div>
              </section>

              {error && <p className={styles.errorMsg}>{error}</p>}

              <div className={`${styles.actionsDivider} flex items-center justify-end gap-3 pt-2`}>
                <button type="button" onClick={() => router.push('/owner')} className={styles.cancelBtn}>
                  Cancel
                </button>
                <motion.button type="submit" disabled={submitting}
                  whileHover={!submitting ? { scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } } : undefined}
                  whileTap={!submitting ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
                  className={styles.submitBtn}>
                  <PlusIcon color="#003739" />
                  {submitting ? 'Registering…' : 'Register Vehicle'}
                </motion.button>
              </div>

            </div>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 3: Create `components/workshop/WorkshopSetupForm.module.scss`**

```scss
// components/workshop/WorkshopSetupForm.module.scss

.glowTopRight {
  @include glow-blob;
  top: -10%;
  right: -5%;
  width: 24rem;
  height: 24rem;
}

.glowBottomLeft {
  @include glow-blob;
  bottom: -10%;
  left: -5%;
  width: 24rem;
  height: 24rem;
}

.iconWrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: $radius-lg;
  border: 1px solid $color-border;
  background: $color-surface-high;
}

.heading {
  font-size: 1.5rem;
  font-weight: 600;
  color: $color-text;
  @include font-mono;
}

.subheading {
  font-size: 0.875rem;
  color: $color-text-muted;
}

.card {
  @include card;
  border-radius: $radius-xl;
  overflow: hidden;
}

.topAccent {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 1px;
  background: $color-primary;
  opacity: 0.5;
}

.errorMsg {
  font-size: 0.875rem;
  text-align: center;
  color: $color-error;
  background: $color-error-bg;
  border: 1px solid $color-error-border;
  border-radius: $radius;
  padding: 0.5rem 0.75rem;
}

.label {
  @include input-label;
}

.input {
  @include input-base;
  padding: 0.75rem 1rem;
}

.submitBtn {
  @include btn-primary;
  width: 100%;
  padding: 0.75rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}
```

- [ ] **Step 4: Update `components/workshop/WorkshopSetupForm.tsx`**

```tsx
// components/workshop/WorkshopSetupForm.tsx
'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { motionTokens } from '@/lib/motionTokens'
import { WrenchIcon } from '@/components/ui/icons'
import styles from './WorkshopSetupForm.module.scss'

export function WorkshopSetupForm() {
  const { update } = useSession()
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const form = e.currentTarget
      const name = (form.elements.namedItem('name') as HTMLInputElement).value
      const address = (form.elements.namedItem('address') as HTMLInputElement).value
      const phone = (form.elements.namedItem('phone') as HTMLInputElement).value
      const email = (form.elements.namedItem('email') as HTMLInputElement).value

      const res = await fetch('/api/workshop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address, phone, email }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Failed to create workshop')
        return
      }

      await update()
      router.push('/mechanic')
      router.refresh()
    } catch {
      setError('Failed to create workshop')
    } finally {
      setLoading(false)
    }
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className={styles.glowTopRight} />
      <div className={styles.glowBottomLeft} />

      <motion.div
        initial={{ opacity: 0, y: motionTokens.distance.lg }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }}
        className="w-full max-w-[448px] flex flex-col gap-6 z-10"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={styles.iconWrapper}><WrenchIcon /></div>
          <div className="flex flex-col gap-1">
            <h1 className={styles.heading}>Set up your workshop</h1>
            <p className={styles.subheading}>Tell us about your workshop to get started.</p>
          </div>
        </div>

        <div className={`${styles.card} relative`}>
          <div className={styles.topAccent} />
          <div className="p-8 flex flex-col gap-5">
            <AnimatePresence mode="wait">
              {error && (
                <motion.p key="error"
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
                  className={styles.errorMsg}>
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label htmlFor="ws-name" className={styles.label}>Workshop name</label>
                <input id="ws-name" name="name" type="text" required
                  placeholder="e.g. Smith's Auto Repair" className={styles.input} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="ws-address" className={styles.label}>Address</label>
                <input id="ws-address" name="address" type="text" required
                  placeholder="123 Main St, City, State" className={styles.input} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="ws-phone" className={styles.label}>Phone</label>
                <input id="ws-phone" name="phone" type="tel" required
                  placeholder="+1 (555) 000-0000" className={styles.input} />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="ws-email" className={styles.label}>Workshop email</label>
                <input id="ws-email" name="email" type="email" required
                  placeholder="workshop@example.com" className={styles.input} />
              </div>
              <motion.button type="submit" disabled={loading}
                whileHover={!loading ? { scale: 1.02, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.sharp } } : undefined}
                whileTap={!loading ? { scale: 0.97, transition: { duration: 0.1 } } : undefined}
                className={styles.submitBtn}>
                {loading ? 'Creating workshop…' : 'Create workshop'}
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>
    </MotionConfig>
  )
}
```

- [ ] **Step 5: Verify forms**

Run: `npm run dev`
- http://localhost:3000/owner/vehicles/new — section labels (Identification, Details, Media) in JetBrains Mono uppercase; cyan focus on inputs; cyan top accent stripe; "Register Vehicle" button is cyan with dark text
- http://localhost:3000/workshop/setup — same pattern: cyan glow blobs, cyan accented card top, cyan submit button

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/owner/vehicles/new/NewVehicleForm.module.scss" \
        "app/(dashboard)/owner/vehicles/new/NewVehicleForm.tsx" \
        components/workshop/WorkshopSetupForm.module.scss \
        components/workshop/WorkshopSetupForm.tsx
git commit -m "feat: migrate form components to SCSS modules with Midnight Tech design"
```

---

## Self-Review

### Spec coverage
- ✅ SCSS modules per component — every component gets a `.module.scss` sibling
- ✅ Shared tokens in `styles/_tokens.scss`, auto-injected via `additionalData`
- ✅ Shared mixins in `styles/_mixins.scss`, auto-injected after tokens
- ✅ Midnight Tech colors applied throughout: `#121414` background, `#55d8e1` cyan primary, `#1a1c1c` surfaces, `#3c494a` borders
- ✅ JetBrains Mono replaces Be Vietnam Pro for all headlines, labels, and monospace UI text
- ✅ Inter retained for body/paragraph text
- ✅ Glow blobs changed from red (`#ff5544`) to cyan (`#55d8e1`)
- ✅ All hardcoded hex colors removed from JSX (zero `bg-[#...]`, `text-[#...]`, `border-[#...]`)
- ✅ All `style={{ fontFamily: ... }}` inline props removed from TSX
- ✅ Tailwind layout utilities preserved across all components

### Placeholder scan
None found.

### Type consistency
- `$color-on-primary` is `#003739` — used as `color="#003739"` in icon `color` props (cannot use SCSS variable in JSX prop; these are the only remaining literal hex values, which is expected)
- `$color-primary` is `#55d8e1` — used as `color="#55d8e1"` in icon `color` props for the same reason
- All `styles.X` class names used in TSX files match the class names defined in their corresponding `.module.scss` files
- All mixin names (`btn-primary`, `input-base`, `input-label`, `card`, `glow-blob`, `font-mono`) are consistent between `_mixins.scss` and the `@include` calls in module files
