import { useState, useEffect } from "react";
import { Product, StoreState } from "../utils/store";
import {
  saveStoreStateToFirestore,
  deleteProductFromFirestore,
  subscribeToStoreState,
} from "../utils/firebase";

const KEY = "skip_store_active_state_v1";

function loadProducts(): Product[] {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.products)) {
        return parsed.products;
      }
    }
  } catch {
    // fallback
  }
  return [];
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>(loadProducts);

  useEffect(() => {
    const unsubscribe = subscribeToStoreState((fsState) => {
      if (fsState && Array.isArray(fsState.products)) {
        setProducts(fsState.products);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const addProduct = async (p: Partial<Product>) => {
    const newProduct: Product = {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: p.name || "",
      category: p.category || "أطقم",
      price: p.price ?? null,
      sizes: p.sizes || "",
      soldOut: !!p.soldOut,
      image: p.image || "",
    };
    const updated = [newProduct, ...products];
    setProducts(updated);

    try {
      const currentSaved = localStorage.getItem(KEY);
      const parsed: StoreState = currentSaved
        ? JSON.parse(currentSaved)
        : { v: 1, updatedAt: Date.now(), settings: { name: "Skip", phone: "" }, products: [] };
      const newState: StoreState = {
        ...parsed,
        updatedAt: Date.now(),
        products: updated,
      };
      localStorage.setItem(KEY, JSON.stringify(newState));
      await saveStoreStateToFirestore(newState);
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newState),
      }).catch(() => null);
    } catch (e) {
      console.warn("Storage exception:", e);
    }
  };

  const updateProduct = async (id: string, changes: Partial<Product>) => {
    const updated = products.map((p) => (p.id === id ? { ...p, ...changes } : p));
    setProducts(updated);

    try {
      const currentSaved = localStorage.getItem(KEY);
      const parsed: StoreState = currentSaved
        ? JSON.parse(currentSaved)
        : { v: 1, updatedAt: Date.now(), settings: { name: "Skip", phone: "" }, products: [] };
      const newState: StoreState = {
        ...parsed,
        updatedAt: Date.now(),
        products: updated,
      };
      localStorage.setItem(KEY, JSON.stringify(newState));
      await saveStoreStateToFirestore(newState);
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newState),
      }).catch(() => null);
    } catch (e) {
      console.warn("Storage exception:", e);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("متأكد من الحذف؟")) return;
    const now = Date.now();
    const updated = products.filter((p) => p.id !== id);
    setProducts(updated);

    try {
      await deleteProductFromFirestore(id, now);
      const currentSaved = localStorage.getItem(KEY);
      const parsed: StoreState = currentSaved
        ? JSON.parse(currentSaved)
        : { v: 1, updatedAt: Date.now(), settings: { name: "Skip", phone: "" }, products: [] };
      const newState: StoreState = {
        ...parsed,
        updatedAt: now,
        products: updated,
      };
      localStorage.setItem(KEY, JSON.stringify(newState));
      await saveStoreStateToFirestore(newState);
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newState),
      }).catch(() => null);
    } catch (e) {
      console.warn("Delete exception:", e);
    }
  };

  return { products, addProduct, updateProduct, deleteProduct };
}
