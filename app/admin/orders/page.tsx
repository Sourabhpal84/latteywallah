'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

type AdminOrder = { id: string; customer?: { name?: string; phone?: string }; totalAmount?: number; paymentStatus?: string; orderStatus?: string }
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]); const [ready, setReady] = useState(false); const [error, setError] = useState('')
  useEffect(() => { if (!auth) return; return auth.onAuthStateChanged(async user => { if (!user) { window.location.href = '/admin/login'; return }; try { const snapshot = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))); setOrders(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AdminOrder))) } catch { setError('Orders could not be loaded. Check admin permissions and the Firestore index.') } finally { setReady(true) } }) }, [])
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">ADMIN</p><h1>Orders</h1></div><div className="admin-header-actions"><Link href="/admin" className="button button-outline">PRODUCTS</Link><Link href="/admin/categories" className="button button-outline">CATEGORIES</Link></div></header><section className="admin-content"><p className="eyebrow">ORDER MANAGEMENT</p>{!ready && <p>Loading orders…</p>}{error && <p className="admin-error">{error}</p>}{ready && !orders.length && !error && <p>No orders yet.</p>}{orders.map(order => <article className="admin-order-row" key={order.id}><div><b>#{order.id}</b><span>{order.customer?.name || 'Customer'} · {order.customer?.phone || 'No phone'}</span></div><strong>₹{(order.totalAmount || 0).toLocaleString('en-IN')}</strong><span>{order.paymentStatus || 'PENDING'}</span><span>{order.orderStatus || 'PENDING PAYMENT'}</span><Link href={`/admin/orders/${order.id}`}>VIEW DETAILS</Link></article>)}</section></main>
}
