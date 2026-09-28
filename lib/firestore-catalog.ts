import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Product } from '@/lib/products'

export const firebaseConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_API_KEY)

export async function loadProductsFromFirestore(fallback: Product[]) {
  if (!firebaseConfigured) return fallback
  const snapshot = await getDocs(collection(db, 'products'))
  return snapshot.docs.map(item => item.data() as Product)
}

export async function saveProductToFirestore(product: Product) {
  if (!firebaseConfigured) return
  await setDoc(doc(db, 'products', product.id), { ...product, active: true, updatedAt: new Date().toISOString() })
}

export async function deleteProductFromFirestore(id: string) {
  if (!firebaseConfigured) return
  await deleteDoc(doc(db, 'products', id))
}

export async function loadCategoriesFromFirestore(fallback: string[]) {
  if (!firebaseConfigured) return fallback
  const snapshot = await getDocs(collection(db, 'categories'))
  return snapshot.docs.map(item => String(item.data().name)).filter(Boolean)
}

export async function saveCategoryToFirestore(name: string) {
  if (!firebaseConfigured) return
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  await setDoc(doc(db, 'categories', id), { name, enabled: true, position: Date.now(), updatedAt: new Date().toISOString() })
}

export async function deleteCategoryFromFirestore(name: string) {
  if (!firebaseConfigured) return
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  await deleteDoc(doc(db, 'categories', id))
}
