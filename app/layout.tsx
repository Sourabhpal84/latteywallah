import './globals.css'
import { ToastProvider } from '@/components/toast'
import { PwaClient } from '@/components/pwa-client'

export const metadata = { title: 'Lattey Walla — Everyday style. Elevated.', description: 'Everyday style. Delivered.', applicationName: 'Lattey Walla', appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Lattey Walla' }, icons: { icon: '/icons/icon-192.png', apple: '/icons/icon-192.png' } }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><ToastProvider>{children}<PwaClient /></ToastProvider></body></html>
}
