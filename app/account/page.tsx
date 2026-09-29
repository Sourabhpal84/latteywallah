'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signOut, User } from 'firebase/auth'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { auth, db } from '@/lib/firebase'

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null)
  const [orders, setOrders] = useState<Array<{ id: string; totalAmount: number; orderStatus: string }>>([])
  useEffect(() => { if (!auth) return; return auth.onAuthStateChanged(async current => { setUser(current); if (current) { const snapshot = await getDocs(query(collection(db, 'orders'), where('customerId', '==', current.uid))); setOrders(snapshot.docs.map(item => ({ id: item.id, ...(item.data() as { totalAmount: number; orderStatus: string }) }))) } }) }, [])
  if (!user) return <main className="order-page"><section className="order-card"><h1>Sign in to view your account.</h1><Link className="button button-dark" href="/account/login">SIGN IN <ArrowRight size={15} /></Link></section></main>
  return <main className="order-page"><header className="detail-header"><Link href="/" className="back-link"><ArrowLeft size={16} /> STORE</Link><span className="logo">MY ACCOUNT</span><button className="button button-dark" onClick={() => signOut(auth)}>LOG OUT</button></header><section className="account-content"><p className="eyebrow">ACCOUNT</p><h1>{user.email}</h1><div className="account-orders"><div className="section-head"><h2>My orders</h2></div>{orders.length ? orders.map(order => <Link className="account-order" href={`/orders/${order.id}`} key={order.id}><span>#{order.id}</span><b>₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</b><em>{order.orderStatus || 'PENDING'}</em><ArrowRight size={15} /></Link>) : <p>No orders yet.</p>}</div></section></main>
}
