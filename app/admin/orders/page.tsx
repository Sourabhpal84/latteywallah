'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

const statuses = ['ALL', 'NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT FOR DELIVERY', 'DELIVERED', 'CANCELLED', 'REJECTED']
type AdminOrder = { id: string; displayOrderId?: string; customer?: { name?: string; phone?: string; email?: string }; totalAmount?: number; paymentStatus?: string; orderStatus?: string; deliveryAddress?: { city?: string; pincode?: string }; createdAt?: string }
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]); const [filter, setFilter] = useState('ALL'); const [ready, setReady] = useState(false); const [error, setError] = useState('')
  useEffect(() => { if (!auth) return; return auth.onAuthStateChanged(user => { if (!user) { window.location.href = '/admin/login'; return }; return onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), snapshot => { setOrders(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AdminOrder))); setReady(true) }, () => { setError('Orders could not be loaded. Check admin permissions.'); setReady(true) }) }) }, [])
  const visible = filter === 'ALL' ? orders : orders.filter(order => order.orderStatus === filter)
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">ADMIN</p><h1>Orders</h1></div><div className="admin-header-actions"><Link href="/admin" className="button button-outline">PRODUCTS</Link><Link href="/admin/categories" className="button button-outline">CATEGORIES</Link></div></header><section className="admin-content"><p className="eyebrow">REALTIME ORDER MANAGEMENT</p><div className="order-filters">{statuses.map(status => <button className={filter === status ? 'active' : ''} key={status} onClick={() => setFilter(status)}>{status}</button>)}</div>{!ready && <p>Loading orders…</p>}{error && <p className="admin-error">{error}</p>}{ready && !visible.length && !error && <p>No orders in this section.</p>}{visible.map(order => <article className="admin-order-row" key={order.id}><div><b>#{order.displayOrderId || order.id}</b><span>{order.customer?.name || 'Customer'} · {order.customer?.phone || 'No phone'} · {order.deliveryAddress?.city || ''} {order.deliveryAddress?.pincode || ''}</span></div><strong>₹{(order.totalAmount || 0).toLocaleString('en-IN')}</strong><span>{order.paymentStatus || 'PENDING'}</span><span>{order.orderStatus || 'NEW'}</span><Link href={`/admin/orders/${order.id}`}>VIEW DETAILS</Link></article>)}</section></main>
}
