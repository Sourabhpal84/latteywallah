import './globals.css'
import { ToastProvider } from '@/components/toast'
import { PwaClient } from '@/components/pwa-client'
import { FloatingCart } from '@/components/floating-cart'

export const metadata = { title: 'LATTEY WALA — Everyday style. Elevated.', description: 'Everyday style. Delivered.', applicationName: 'LATTEY WALA', appleWebApp: { capable: true, statusBarStyle: 'default', title: 'LATTEY WALA' }, icons: { icon: '/icons/lattey-wala-logo.jpg', apple: '/icons/lattey-wala-logo.jpg' } }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><ToastProvider>{children}<FloatingCart /><PwaClient /></ToastProvider></body></html>
}
