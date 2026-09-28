'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { onAuthStateChanged, User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { CategoryNode, slugify } from '@/lib/category-tree'
import { deleteCategoryFromFirestore, loadCategoryNodesFromFirestore, saveCategoryToFirestore } from '@/lib/firestore-catalog'

const key = 'lattey-wallah-category-tree'
const seed: CategoryNode[] = []

export default function AdminCategoriesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [nodes, setNodes] = useState<CategoryNode[]>(seed)
  useEffect(() => onAuthStateChanged(auth, current => { setUser(current); setReady(true); if (!current) window.location.href = '/admin/login' }), [])
  useEffect(() => { if (!user) return; const load = async () => { const saved = JSON.parse(localStorage.getItem(key) || '[]') as CategoryNode[]; const loaded = await loadCategoryNodesFromFirestore(saved); setNodes(loaded); localStorage.setItem(key, JSON.stringify(loaded)) }; load() }, [user])
  const add = async (parentId: string | null) => { const name = prompt(parentId ? 'Subcategory name' : 'Main category name'); if (!name?.trim()) return; const node = { id: `${slugify(name)}-${Date.now()}`, name: name.trim(), slug: slugify(name), parentId, active: true, sortOrder: Date.now() }; await saveCategoryToFirestore(name.trim(), parentId); const next = [...nodes, node]; setNodes(next); localStorage.setItem(key, JSON.stringify(next)) }
  const remove = async (node: CategoryNode) => { if (nodes.some(item => item.parentId === node.id)) { alert('Delete child categories first.'); return } if (!confirm(`Delete ${node.name}?`)) return; await deleteCategoryFromFirestore(node.name); const next = nodes.filter(item => item.id !== node.id); setNodes(next); localStorage.setItem(key, JSON.stringify(next)) }
  const tree = (parentId: string | null, level = 0): React.ReactNode => nodes.filter(node => node.parentId === parentId).sort((a, b) => a.sortOrder - b.sortOrder).map(node => <div className="category-tree-row" style={{ marginLeft: `${level * 26}px` }} key={node.id}><span className="tree-index">{level ? '↳' : '•'}</span><b>{node.name}</b><span className="tree-count">{nodes.filter(child => child.parentId === node.id).length} subcategories</span><button className="tree-add" onClick={() => add(node.id)}><Plus size={14} /> SUBCATEGORY</button><button className="tree-delete" onClick={() => remove(node)}><Trash2 size={14} /></button>{tree(node.id, level + 1)}</div>)
  if (!ready || !user) return <main className="admin-page" />
  return <main className="admin-page"><header className="admin-header"><Link href="/admin" className="back-link"><ArrowLeft size={16} /> ADMIN</Link><div className="logo">LATTEY <span>WALLAH</span></div><span className="admin-badge">CATEGORY MANAGER</span></header><div className="category-manager"><div className="admin-intro"><div><p className="eyebrow">CATALOG STRUCTURE</p><h1>Categories & subcategories</h1><p>Create unlimited nested levels. Products can be assigned to the final category node.</p></div><button className="button button-dark" onClick={() => add(null)}><Plus size={15} /> ADD MAIN CATEGORY</button></div><div className="category-tree">{tree(null)}</div></div></main>
}
