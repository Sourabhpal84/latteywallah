export type CategoryNode = { id: string; name: string; slug: string; parentId: string | null; image?: string; active: boolean; sortOrder: number }

export function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') }
export function descendantsOf(categories: CategoryNode[], id: string) { const ids = new Set([id]); let changed = true; while (changed) { changed = false; categories.forEach(category => { if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) { ids.add(category.id); changed = true } }) } return ids }
export function categoryTrail(categories: CategoryNode[], id: string) { const result: CategoryNode[] = []; let current = categories.find(category => category.id === id); while (current) { result.unshift(current); current = current.parentId ? categories.find(category => category.id === current?.parentId) : undefined } return result }
