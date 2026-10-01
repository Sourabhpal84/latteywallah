'use client'
import { useEffect } from 'react'
export default function LoginPage() { useEffect(() => { window.location.replace('/account/login') }, []); return <main className="order-page"><p>Opening login…</p></main> }
