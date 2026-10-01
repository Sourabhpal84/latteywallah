'use client'
import { useEffect } from 'react'
export default function AdminProductsPage() { useEffect(() => { window.location.replace('/admin#products') }, []); return <main className="admin-page"><p>Opening product manager…</p></main> }
