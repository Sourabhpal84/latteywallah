'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return <>{children}{pathname !== '/admin/login' && <Link className="admin-orders-shortcut" href="/admin/orders">ORDERS</Link>}</>
}
