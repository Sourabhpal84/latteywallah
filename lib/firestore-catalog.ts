import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Product } from '@/lib/products'
import { CategoryNode } from '@/lib/category-tree'

export const firebaseConfigured = Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID && process.env.NEXT_PUBLIC_FIREBASE_API_KEY)

export async function loadProductsFromFirestore(fallback: Product[]) {
  if (!firebaseConfigured) return fallback
  try {
    const snapshot = await getDocs(query(collection(db, 'products'), where('active', '==', true)))
    return snapshot.docs.map(item => item.data() as Product)
  } catch {
    return fallback
  }
}

export async function saveProductToFirestore(product: Product) {
  if (!firebaseConfigured) return
  try { await setDoc(doc(db, 'products', product.id), { ...product, active: true, updatedAt: new Date().toISOString() }) } catch { return }
}

export async function deleteProductFromFirestore(id: string) {
  if (!firebaseConfigured) return
  try { await deleteDoc(doc(db, 'products', id)) } catch { return }
}

export async function loadCategoriesFromFirestore(fallback: string[]) {
  if (!firebaseConfigured) return fallback
  try {
    const snapshot = await getDocs(query(collection(db, 'categories'), where('enabled', '==', true)))
    return snapshot.docs.map(item => String(item.data().name)).filter(Boolean)
  } catch {
    return fallback
  }
}

export async function loadCategoryNodesFromFirestore(fallback: CategoryNode[]) {
  if (!firebaseConfigured) return fallback
  try {
    const snapshot = await getDocs(query(collection(db, 'categories'), where('active', '==', true)))
    return snapshot.docs.map(item => ({ id: item.id, name: String(item.data().name), slug: String(item.data().slug || item.id), parentId: (item.data().parentId as string | null) || null, image: item.data().image as string | undefined, active: true, sortOrder: Number(item.data().sortOrder || 0) })).sort((a, b) => a.sortOrder - b.sortOrder)
  } catch { return fallback }
}

export async function saveCategoryToFirestore(name: string, parentId: string | null = null) {
  if (!firebaseConfigured) return
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  try { await setDoc(doc(db, 'categories', id), { name, active: true, enabled: true, parentId, slug: id, sortOrder: Date.now(), position: Date.now(), updatedAt: new Date().toISOString() }) } catch { return }
}

export async function deleteCategoryFromFirestore(name: string) {
  if (!firebaseConfigured) return
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  try { await deleteDoc(doc(db, 'categories', id)) } catch { return }
}
