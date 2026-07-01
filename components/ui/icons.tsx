export function MailIcon() {
  return (
    <svg width="16" height="13" viewBox="0 0 16 13" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.75" y="0.75" width="14.5" height="11.5" rx="0.917" stroke="#8d90a0" strokeWidth="1.5"/>
      <path d="M0.75 2.5L8 7.5L15.25 2.5" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function LockIcon() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.75" y="7.25" width="10.5" height="7.5" rx="1.25" stroke="#8d90a0" strokeWidth="1.5"/>
      <path d="M4 7V5C4 3.34315 5.34315 2 7 2C8.65685 2 10 3.34315 10 5V7" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function UserIcon() {
  return (
    <svg width="14" height="15" viewBox="0 0 14 15" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="7" cy="5" r="3.25" stroke="#8d90a0" strokeWidth="1.5"/>
      <path d="M1.5 13.5C1.5 10.7386 4.01472 8.5 7 8.5C9.98528 8.5 12.5 10.7386 12.5 13.5" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function EyeIcon() {
  return (
    <svg width="17" height="12" viewBox="0 0 17 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 6C1 6 3.5 1 8.5 1C13.5 1 16 6 16 6C16 6 13.5 11 8.5 11C3.5 11 1 6 1 6Z" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="8.5" cy="6" r="2.25" stroke="#8d90a0" strokeWidth="1.5"/>
    </svg>
  )
}

export function EyeOffIcon() {
  return (
    <svg width="17" height="14" viewBox="0 0 17 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L16 13" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7.3 3.2C7.7 3.1 8.1 3 8.5 3C13.5 3 16 8 16 8C16 8 15.2 9.4 13.9 10.6M4.9 4.8C2.9 6 1 8 1 8C1 8 3.5 13 8.5 13C10 13 11.3 12.5 12.4 11.8" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M6.5 6.7C6.2 7.1 6 7.5 6 8C6 9.1 7.1 10 8.5 10C9 10 9.5 9.9 9.8 9.6" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 7H11" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 4L11 7L8 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function CarIcon({ color = '#b4c5ff' }: { color?: string }) {
  return (
    <svg width="24" height="20" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.77 6.4A2 2 0 0 0 18.86 5H5.14a2 2 0 0 0-1.913 1.4L2 11V18a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h14v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-7L20.77 6.4Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="6" cy="14" r="1.5" fill={color}/>
      <circle cx="18" cy="14" r="1.5" fill={color}/>
      <path d="M2 11H22" stroke={color} strokeWidth="1.5"/>
    </svg>
  )
}

export function WrenchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" stroke="#b4c5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function BellIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 18a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2zm6-5V8a6 6 0 0 0-5-5.92V1a1 1 0 1 0-2 0v1.08A6 6 0 0 0 2 8v5l-1.71 1.71A1 1 0 0 0 1 16h14a1 1 0 0 0 .71-1.71L14 13z" fill="#c3c6d7"/>
    </svg>
  )
}

export function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 11.5A2.5 2.5 0 1 1 9 6.5a2.5 2.5 0 0 1 0 5zm6.36-1.43a5.9 5.9 0 0 0 .05-.57c0-.2-.02-.4-.05-.58l1.26-.97a.3.3 0 0 0 .07-.38l-1.2-2.06a.3.3 0 0 0-.36-.13l-1.48.59a5.6 5.6 0 0 0-1-.58L12.4 3.9a.3.3 0 0 0-.3-.26h-2.4a.3.3 0 0 0-.3.26l-.23 1.57c-.36.14-.7.33-1 .58l-1.48-.6a.3.3 0 0 0-.36.14L5.13 7.65a.28.28 0 0 0 .07.38l1.26.97c-.03.18-.05.38-.05.57 0 .2.02.4.05.58L5.2 11.12a.3.3 0 0 0-.07.38l1.2 2.06c.07.13.23.17.36.13l1.48-.59c.3.22.64.41 1 .58l.23 1.57c.03.15.17.26.3.26h2.4c.13 0 .27-.11.3-.26l.23-1.57c.36-.17.7-.36 1-.58l1.48.59c.13.04.29 0 .36-.13l1.2-2.06a.28.28 0 0 0-.07-.38l-1.26-.97z" fill="#c3c6d7"/>
    </svg>
  )
}

export function PlusIcon({ color = '#002a78' }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 1v12M1 7h12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function ChevronRightIcon() {
  return (
    <svg width="8" height="12" viewBox="0 0 8 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.5 1L6.5 6L1.5 11" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 4L3.5 6.5L9 1" stroke="#0b1326" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function CalendarIcon() {
  return (
    <svg width="16" height="18" viewBox="0 0 16 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="3" width="14" height="14" rx="1.5" stroke="#c3c6d7" strokeWidth="1.5"/>
      <path d="M1 7h14" stroke="#c3c6d7" strokeWidth="1.5"/>
      <path d="M5 1v3M11 1v3" stroke="#c3c6d7" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17 8L12 3L7 8" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 3v12" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function OdometerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6.25" stroke="#8d90a0" strokeWidth="1.5"/>
      <path d="M5 11L8 8" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="8" r="1" fill="#8d90a0"/>
    </svg>
  )
}

export function ChevronDownIcon() {
  return (
    <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1.5L6 6.5L11 1.5" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function ScanIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 5V2a1 1 0 0 1 1-1h3M15 5V2a1 1 0 0 0-1-1h-3M1 11v3a1 1 0 0 0 1 1h3M15 11v3a1 1 0 0 1-1 1h-3" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M1 8h14" stroke="#8d90a0" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function MapPinIcon({ color = '#6b7280' }: { color?: string }) {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 15S13 9.6 13 5.75A6 6 0 0 0 1 5.75C1 9.6 7 15 7 15Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="7" cy="5.75" r="2" stroke={color} strokeWidth="1.5"/>
    </svg>
  )
}

export function ServiceIcon({ color = '#6b7280' }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.8 4.2a.67.67 0 0 0 0 .94l1.07 1.07a.67.67 0 0 0 .94 0l2.51-2.51a4 4 0 0 1-5.3 5.3l-4.6 4.6a1.41 1.41 0 0 1-2-2l4.6-4.6a4 4 0 0 1 5.3-5.3L9.8 4.2Z" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 2h12M3.5 7h7M6 12h2" stroke="#bbc9ca" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function SearchIcon({ color = '#003739' }: { color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="4.5" stroke={color} strokeWidth="1.5"/>
      <path d="M13 13L9.5 9.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 1L13 13M13 1L1 13" stroke="#bbc9ca" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}
