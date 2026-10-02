import './globals.css'
import { ToastProvider } from '@/components/toast'
import { PwaClient } from '@/components/pwa-client'

export const metadata = { title: 'LATTEY WALA — Everyday style. Elevated.', description: 'Everyday style. Delivered.', applicationName: 'LATTEY WALA', appleWebApp: { capable: true, statusBarStyle: 'default', title: 'LATTEY WALA' }, icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' } }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><ToastProvider>{children}<PwaClient /></ToastProvider></body></html>
}
