import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getAdminApp() {
  if (getApps().length) return getApps()[0]
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!process.env.FIREBASE_CLIENT_EMAIL || !privateKey || !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) throw new Error('Firebase Admin environment variables are missing')
  return initializeApp({ credential: cert({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey }) })
}
export function getAdminAuth() { return getAuth(getAdminApp()) }
export function getAdminDb() { return getFirestore(getAdminApp()) }
export async function requireUser(request: Request) { const header = request.headers.get('authorization') || ''; if (!header.startsWith('Bearer ')) throw new Error('Authentication required'); return getAdminAuth().verifyIdToken(header.slice(7)) }
