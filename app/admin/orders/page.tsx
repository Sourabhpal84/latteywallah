'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query, serverTimestamp, updateDoc, doc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

const statuses = ['PENDING PAYMENT', 'CONFIRMED', 'PROCESSING', 'PACKED', 'DISPATCHED', 'OUT FOR DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED']
type AdminOrder = { id: string; customer?: { name?: string; phone?: string }; totalAmount?: number; paymentStatus?: string; orderStatus?: string }

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]); const [ready, setReady] = useState(false); const [error, setError] = useState('')
  const load = async () => { try { const snapshot = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc'))); setOrders(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AdminOrder))) } catch { setError('Orders could not be loaded. Check admin permissions and the Firestore index.') } }
  useEffect(() => { if (!auth) { window.location.href = '/admin/login'; return }; return auth.onAuthStateChanged(async user => { if (!user) { window.location.href = '/admin/login'; return }; await load(); setReady(true) }) }, [])
  const updateStatus = async (id: string, orderStatus: string) => { await updateDoc(doc(db, 'orders', id), { orderStatus, updatedAt: serverTimestamp(), updatedBy: auth?.currentUser?.uid || '' }); setOrders(current => current.map(order => order.id === id ? { ...order, orderStatus } : order)) }
  return <main className="admin-page"><header className="admin-header"><div><p className="eyebrow">ADMIN</p><h1>Orders</h1></div><div className="admin-header-actions"><Link href="/admin" className="button button-outline">PRODUCTS</Link><Link href="/admin/categories" className="button button-outline">CATEGORIES</Link></div></header><section className="admin-content"><p className="eyebrow">ORDER MANAGEMENT</p>{!ready && <p>Loading orders…</p>}{error && <p className="admin-error">{error}</p>}{ready && !orders.length && !error && <p>No orders yet.</p>}{orders.map(order => <article className="admin-order-row" key={order.id}><div><b>#{order.id}</b><span>{order.customer?.name || 'Customer'} · {order.customer?.phone || 'No phone'}</span></div><strong>₹{(order.totalAmount || 0).toLocaleString('en-IN')}</strong><span>{order.paymentStatus || 'PENDING'}</span><select value={order.orderStatus || 'PENDING PAYMENT'} onChange={event => updateStatus(order.id, event.target.value)}>{statuses.map(status => <option key={status} value={status}>{status}</option>)}</select><Link href={`/orders/${order.id}`}>VIEW</Link></article>)}</section></main>
}
