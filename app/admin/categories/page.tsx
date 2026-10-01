"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { CategoryNode, slugify } from "@/lib/category-tree";
import {
  addCategory,
  deleteCategory,
  getCategories,
} from "@/lib/firestore-catalog";

const seed: CategoryNode[] = [];
const catalogError = (error: unknown) =>
  String((error as { message?: string })?.message || error).includes(
    "permission-denied",
  )
    ? "Firestore blocked this change. Add your Firebase Authentication UID to the admins collection, then publish firestore.rules."
    : `Catalog was not changed: ${String((error as { message?: string })?.message || error)}`;

export default function AdminCategoriesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [nodes, setNodes] = useState<CategoryNode[]>(seed);
  const [notice, setNotice] = useState("");
  useEffect(
    () =>
      onAuthStateChanged(auth, (current) => {
        setUser(current);
        setReady(true);
        if (!current) window.location.href = "/admin/login";
      }),
    [],
  );
  useEffect(() => {
    if (!user) return;
    getCategories()
      .then(setNodes)
      .catch((error) => setNotice(catalogError(error)));
  }, [user]);
  const add = async (parentId: string | null) => {
    const name = prompt(parentId ? "Subcategory name" : "Main category name");
    if (!name?.trim()) return;
    const image = parentId
      ? prompt("Subcategory image URL (required for the visual card)")
      : "";
    if (parentId && !image?.trim()) return;
    try {
      const node = await addCategory({
        name: name.trim(),
        slug: slugify(name),
        parentId,
        image: image?.trim() || undefined,
        active: true,
        sortOrder: Date.now(),
      });
      setNodes((current) => [...current, node]);
      setNotice(`${node.name} created.`);
    } catch (error) {
      setNotice(catalogError(error));
    }
  };
  const remove = async (node: CategoryNode) => {
    if (nodes.some((item) => item.parentId === node.id)) {
      alert("Delete child categories first.");
      return;
    }
    if (!confirm(`Delete ${node.name}?`)) return;
    try {
      await deleteCategory(node.id);
      setNodes((current) => current.filter((item) => item.id !== node.id));
      setNotice(`${node.name} deleted.`);
    } catch (error) {
      setNotice(catalogError(error));
    }
  };
  const tree = (parentId: string | null, level = 0): React.ReactNode =>
    nodes
      .filter((node) => node.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((node) => (
        <div
          className="category-tree-row"
          style={{ marginLeft: `${level * 26}px` }}
          key={node.id}
        >
          <span className="tree-index">{level ? "↳" : "•"}</span>
          <b>{node.name}</b>
          <span className="tree-count">
            {nodes.filter((child) => child.parentId === node.id).length}{" "}
            subcategories
          </span>
          <button className="tree-add" onClick={() => add(node.id)}>
            <Plus size={14} /> SUBCATEGORY
          </button>
          <button className="tree-delete" onClick={() => remove(node)}>
            <Trash2 size={14} />
          </button>
          {tree(node.id, level + 1)}
        </div>
      ));
  if (!ready || !user) return <main className="admin-page" />;
  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/admin" className="back-link">
          <ArrowLeft size={16} /> ADMIN
        </Link>
        <div className="logo">
          LATTEY <span>WALLAH</span>
        </div>
        <span className="admin-badge">CATEGORY MANAGER</span>
      </header>
      <div className="category-manager">
        <div className="admin-intro">
          <div>
            <p className="eyebrow">CATALOG STRUCTURE</p>
            <h1>Categories & subcategories</h1>
            <p>
              Create unlimited nested levels. Products can be assigned to the
              final category node.
            </p>
          </div>
          <button className="button button-dark" onClick={() => add(null)}>
            <Plus size={15} /> ADD MAIN CATEGORY
          </button>
        </div>
        {notice && <p className="admin-notice">{notice}</p>}
        <div className="category-tree">{tree(null)}</div>
      </div>
    </main>
  );
}
