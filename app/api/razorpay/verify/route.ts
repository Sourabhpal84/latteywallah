import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json()
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !process.env.RAZORPAY_KEY_SECRET) return NextResponse.json({ verified: false, error: 'Missing payment verification data' }, { status: 400 })
    const expected = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex')
    const valid = expected.length === razorpay_signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature))
    return NextResponse.json({ verified: valid }, { status: valid ? 200 : 400 })
  } catch { return NextResponse.json({ verified: false, error: 'Payment verification failed' }, { status: 400 }) }
}
