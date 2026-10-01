import './globals.css'
import { ToastProvider } from '@/components/toast'

export const metadata = { title: 'lattey wala — Everyday style. Elevated.', description: 'Modern essentials, cut for your everyday.' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><ToastProvider>{children}</ToastProvider></body></html>
}
