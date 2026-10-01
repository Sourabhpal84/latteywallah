'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

type Order = { id: string; displayOrderId?: string; totalAmount?: number; orderStatus?: string; paymentStatus?: string; createdAt?: string; items?: Array<{ name?: string; quantity?: number }> }
const money = (value = 0) => `₹${value.toLocaleString('en-IN')}`
export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]); const [loading, setLoading] = useState(true); const [signedOut, setSignedOut] = useState(false)
  useEffect(() => { if (!auth) { setSignedOut(true); setLoading(false); return }; return auth.onAuthStateChanged(user => { if (!user) { setSignedOut(true); setLoading(false); return }; setSignedOut(false); return onSnapshot(query(collection(db, 'orders'), where('customerId', '==', user.uid)), snapshot => { setOrders(snapshot.docs.map(item => ({ id: item.id, ...(item.data() as Omit<Order, 'id'>) })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))); setLoading(false) }, () => setLoading(false)) }) }, [])
  if (signedOut) return <main className="order-page"><section className="order-card"><h1>Sign in to view your orders.</h1><Link className="button button-dark" href="/account/login">SIGN IN <ArrowRight size={15} /></Link></section></main>
  return <main className="order-page"><header className="detail-header"><Link href="/" className="back-link"><ArrowLeft size={16} /> STORE</Link><span className="logo">MY ORDERS</span></header><section className="account-content"><p className="eyebrow">ORDER HISTORY</p><h1>Your orders</h1>{loading ? <p>Loading orders…</p> : orders.length ? <div className="account-orders">{orders.map(order => <Link className="account-order" href={`/orders/${order.id}`} key={order.id}><span>#{order.displayOrderId || order.id}</span><b>{money(order.totalAmount)}</b><em>{order.orderStatus || 'NEW'} · {order.paymentStatus || 'PENDING'}</em><small>{order.items?.map(item => `${item.name} × ${item.quantity}`).join(', ')}</small><ArrowRight size={15} /></Link>)}</div> : <p>No orders yet. <Link href="/#shop">Start shopping</Link></p>}</section></main>
}
