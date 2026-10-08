"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { CategoryNode, slugify } from "@/lib/category-tree";
import { Product } from "@/lib/products";
import {
  addCategory,
  addProduct as createProduct,
  deleteCategory,
  deleteProduct,
  getCategories,
  getProducts,
  updateProduct,
} from "@/lib/firestore-catalog";

const blank = {
  name: "",
  description: "",
  mrp: "999",
  price: "699",
  colors: "Black",
  sizes: "S:699, M:699, L:699, XL:699",
  images: ["", "", "", ""],
  material: "Cotton",
  categoryId: "",
};
const catalogError = (error: unknown) =>
  String((error as { message?: string })?.message || error).includes(
    "permission-denied",
  )
    ? "Firestore blocked this change. Add your Firebase Authentication UID to the admins collection, then publish firestore.rules."
    : `Catalog was not changed: ${String((error as { message?: string })?.message || error)}`;

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (current) => {
      setUser(current);
      setReady(true);
      if (!current) window.location.href = "/admin/login";
    });
  }, []);
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [loadedProducts, loadedCategories] = await Promise.all([
        getProducts(),
        getCategories(),
      ]);
      setItems(loadedProducts);
      setCategories(loadedCategories);
    };
    load().catch((error) => setNotice(catalogError(error)));
  }, [user]);

  const categoryOptions = useMemo(
    () => categories.slice().sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );
  const addMainCategory = async () => {
    const name = prompt("Main category name");
    if (!name?.trim()) return;
    const image = prompt("Category image URL (optional; used on the homepage card)");
    if (image === null) return;
    try {
      const node = await addCategory({
        name: name.trim(),
        slug: slugify(name),
        parentId: null,
        image: image.trim(),
        active: true,
        sortOrder: Date.now(),
      });
      setCategories((current) => [...current, node]);
      setNotice(`${node.name} created.`);
    } catch (error) {
      setNotice(catalogError(error));
    }
  };
  const addSubcategory = async (parent: CategoryNode) => {
    const name = prompt(`Subcategory inside ${parent.name}`);
    if (!name?.trim()) return;
    const image = prompt("Subcategory image URL (optional)");
    if (image === null) return;
    try {
      const node = await addCategory({
        name: name.trim(),
        slug: slugify(name),
        parentId: parent.id,
        image: image.trim(),
        active: true,
        sortOrder: Date.now(),
      });
      setCategories((current) => [...current, node]);
      setNotice(`${node.name} added inside ${parent.name}.`);
    } catch (error) {
      setNotice(catalogError(error));
    }
  };
  const removeCategory = async (node: CategoryNode) => {
    if (categories.some((child) => child.parentId === node.id)) {
      alert("Delete child subcategories first.");
      return;
    }
    if (!confirm(`Delete ${node.name}?`)) return;
    try {
      await deleteCategory(node.id);
      setCategories((current) =>
        current.filter((category) => category.id !== node.id),
      );
      setNotice(`${node.name} deleted.`);
    } catch (error) {
      setNotice(catalogError(error));
    }
  };
  const removeProduct = async (product: Product) => {
    if (!confirm(`Delete ${product.name}?`)) return;
    try {
      await deleteProduct(product.id);
      setItems((current) => current.filter((item) => item.id !== product.id));
      setNotice(`${product.name} deleted.`);
    } catch (error) {
      setNotice(catalogError(error));
    }
  };
  const editProduct = (product: Product) => {
    setEditingId(product.id);
    const images = (product.images?.length ? product.images : [product.image]).slice(0, 4);
    const variantPrices = new Map<string, number>();
    (product.variants || []).forEach((variant) => {
      if (!variantPrices.has(variant.size)) variantPrices.set(variant.size, variant.price);
    });
    const variantSizes = (product.variants || []).map((variant) => variant.size).filter((size, index, all) => all.indexOf(size) === index);
    const sizes = product.sizes?.length ? product.sizes : variantSizes;
    const category = categoryOptions.find((item) => item.id === product.categoryId)
      || categoryOptions.find((item) => item.name === product.category);
    setForm({
      name: product.name,
      description: product.description || "",
      mrp: String(product.mrp ?? product.price),
      price: String(product.price),
      colors: (product.colors?.length ? product.colors : [product.color]).filter(Boolean).join(", "),
      sizes: sizes.map((size) => `${size}:${variantPrices.get(size) ?? product.price}`).join(", "),
      images: [...images, ...Array(Math.max(0, 4 - images.length)).fill("")],
      material: product.material || "",
      categoryId: category?.id || product.categoryId || "",
    });
    document.getElementById("product-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(blank);
  };
  const saveProduct = async (event: FormEvent) => {
    event.preventDefault();
    const images = form.images.filter(Boolean);
    if (!form.name.trim() || !images.length || !form.categoryId) {
      setNotice(editingId ? "Product name, category and at least 1 image are required." : "Product name, category and 4 images are required.");
      return;
    }
    if (!editingId && images.length < 4) {
      setNotice("New products need at least 4 image URLs.");
      return;
    }
    const category = categoryOptions.find(
      (item) => item.id === form.categoryId,
    )!;
    const colors = form.colors
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const sizeEntries = form.sizes
      .split(",")
      .map((item) => {
        const [size, amount] = item.trim().split(":");
        return { size: size.trim(), price: Number(amount) };
      })
      .filter((item) => item.size);
    const price = Number(form.price);
    const mrp = Number(form.mrp);
    const product = {
      name: form.name,
      category: category.name,
      categoryId: category.id,
      description: form.description,
      price,
      mrp,
      image: images[0],
      images,
      sizes: sizeEntries.map((item) => item.size),
      colors,
      color: colors[0],
      material: form.material,
      active: true,
      published: true,
      variants: colors.flatMap((color) =>
        sizeEntries.map(({ size, price: sizePrice }) => {
          const previous = editingId
            ? items.find((item) => item.id === editingId)?.variants?.find((variant) => variant.color === color && variant.size === size)
            : undefined;
          return ({
          id: previous?.id || `${Date.now()}-${color}-${size}`,
          color,
          size,
          price:
            Number.isFinite(sizePrice) && sizePrice >= 0 ? sizePrice : price,
          stock: previous?.stock ?? 10,
          sku: previous?.sku || `${slugify(form.name).slice(0, 8)}-${color.slice(0, 2)}-${size}`,
        }); }),
      ),
    };
    try {
      if (editingId) {
        await updateProduct(editingId, product);
        setItems((current) => current.map((item) => item.id === editingId ? { ...item, ...product } : item));
        setNotice(`${product.name} updated in Firestore.`);
      } else {
        const saved = await createProduct(product);
        setItems((current) => [saved, ...current]);
        setNotice("Product saved to Firestore.");
      }
      setEditingId(null);
      setForm(blank);
    } catch (error) {
      setNotice(catalogError(error));
    }
  };
  const tree = (parentId: string | null, level = 0): React.ReactNode =>
    categoryOptions
      .filter((category) => category.parentId === parentId)
      .map((category) => (
        <div
          className="category-tree-row"
          style={{ marginLeft: level * 24 }}
          key={category.id}
        >
          <span className="tree-index">{level ? "↳" : "•"}</span>
          <b>{category.name}</b>
          <span className="tree-count">
            {items.filter((item) => item.categoryId === category.id).length}{" "}
            products
          </span>
          <button className="tree-add" onClick={() => addSubcategory(category)}>
            <Plus size={14} /> ADD SUBCATEGORY
          </button>
          <button
            className="tree-delete"
            onClick={() => removeCategory(category)}
          >
            <Trash2 size={14} />
          </button>
          {tree(category.id, level + 1)}
        </div>
      ));

  if (!ready || !user) return <main className="admin-page" />;
  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} /> VIEW STORE
        </Link>
        <div className="logo">
          LATTEY <span>WALA</span>
        </div>
        <div className="admin-header-actions">
          <span className="admin-badge">{user.email}</span>
          <button className="button button-light" onClick={() => signOut(auth)}>
            SIGN OUT
          </button>
        </div>
      </header>
      <div className="admin-layout">
        <aside className="admin-nav">
          <p className="eyebrow">MANAGE STORE</p>
          <a className="active" href="#products">
            Products
          </a>
          <a href="#categories">Categories</a>
          <Link href="/admin/categories">Category Manager</Link>
          <Link href="/admin/orders">Orders</Link>
          <Link href="/admin/complaints">Complaints & Refunds</Link>
          <Link href="/admin/coupons">Coupons</Link>
          <Link href="/admin/delivery-areas">Delivery Areas</Link>
          <Link href="/admin/settings">Store Settings</Link>
        </aside>
        <div className="admin-content">
          <div className="admin-intro">
            <div>
              <p className="eyebrow">CONTROL CENTER</p>
              <h1>Store management</h1>
              <p>Products and categories are saved to the shared catalog.</p>
            </div>
            <span className="admin-status">● FIRESTORE</span>
          </div>
          {notice && <p className="admin-notice">{notice}</p>}
          <section className="admin-section" id="categories">
            <div className="admin-section-head">
              <div>
                <p className="eyebrow">CATEGORIES</p>
                <h2>Category tree</h2>
              </div>
              <button className="button button-dark" onClick={addMainCategory}>
                <Plus size={15} /> ADD MAIN CATEGORY
              </button>
            </div>
            <div className="category-tree">{tree(null)}</div>
          </section>
          <section className="admin-section" id="products">
            <div className="admin-section-head">
              <div>
                <p className="eyebrow">PRODUCTS</p>
                <h2>{items.length} products</h2>
              </div>
            </div>
            <div className="admin-products">
              {items.map((product) => (
                <div className="admin-product" key={product.id}>
                  <img src={product.image} alt="" />
                  <div>
                    <b>{product.name}</b>
                    <span>
                      {product.category} · {product.color}
                    </span>
                  </div>
                  <strong>₹{product.price.toLocaleString("en-IN")}</strong>
                  <button
                    onClick={() => editProduct(product)}
                    aria-label={`Edit ${product.name}`}
                    title="Edit product"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => removeProduct(product)}
                    aria-label={`Delete ${product.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
          <section className="admin-section" id="product-form">
            <div className="admin-section-head">
              <div>
                <p className="eyebrow">{editingId ? "EDIT PRODUCT" : "ADD PRODUCT"}</p>
                <h2>{editingId ? `Update ${form.name}` : "New product"}</h2>
              </div>
              {editingId && <button className="button button-outline" type="button" onClick={cancelEdit}>CANCEL EDIT</button>}
            </div>
            <form className="admin-form" onSubmit={saveProduct}>
              <label>
                Product name
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                />
              </label>
              <label>
                Category / Subcategory
                <select
                  required
                  value={form.categoryId}
                  onChange={(event) =>
                    setForm({ ...form, categoryId: event.target.value })
                  }
                >
                  <option value="">Select category</option>
                  {categoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.parentId ? `↳ ${category.name}` : category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="wide">
                Description
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                />
              </label>
              <label>
                MRP
                <input
                  required
                  type="number"
                  value={form.mrp}
                  onChange={(event) =>
                    setForm({ ...form, mrp: event.target.value })
                  }
                />
              </label>
              <label>
                Selling price
                <input
                  required
                  type="number"
                  value={form.price}
                  onChange={(event) =>
                    setForm({ ...form, price: event.target.value })
                  }
                />
              </label>
              <label>
                Colours
                <input
                  value={form.colors}
                  onChange={(event) =>
                    setForm({ ...form, colors: event.target.value })
                  }
                  placeholder="Black, White, Beige"
                />
              </label>
              <label>
                Sizes & prices
                <input
                  value={form.sizes}
                  onChange={(event) =>
                    setForm({ ...form, sizes: event.target.value })
                  }
                  placeholder="S:499, M:549, L:599, XL:649, XXL:699"
                />
                <small className="field-help">
                  Use Size:Price. Remove a size to disable it.
                </small>
              </label>
              <label>
                Material
                <input
                  value={form.material}
                  onChange={(event) =>
                    setForm({ ...form, material: event.target.value })
                  }
                />
              </label>
              <div className="image-upload wide">
                <div className="upload-title">
                  <span>Product images</span>
                  <small>Minimum 4 image URLs</small>
                </div>
                <div className="image-inputs">
                  {form.images.map((image, index) => (
                    <div className="image-input" key={index}>
                      {image ? (
                        <>
                          <img src={image} alt="Preview" />
                          <button
                            type="button"
                            onClick={() =>
                              setForm({
                                ...form,
                                images: form.images.map((value, i) =>
                                  i === index ? "" : value,
                                ),
                              })
                            }
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <>
                          <ImagePlus size={19} />
                          <input
                            required={!editingId}
                            type="url"
                            placeholder={`Image ${index + 1}`}
                            value={image}
                            onChange={(event) =>
                              setForm({
                                ...form,
                                images: form.images.map((value, i) =>
                                  i === index ? event.target.value : value,
                                ),
                              })
                            }
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <button
                className="button button-dark submit-product"
                type="submit"
              >
                {editingId ? <Pencil size={16} /> : <Plus size={16} />} {editingId ? "SAVE CHANGES" : "ADD PRODUCT"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
