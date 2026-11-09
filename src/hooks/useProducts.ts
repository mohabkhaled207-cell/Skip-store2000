import { useState, useEffect } from "react";
import { Product, StoreState } from "../utils/store";
import {
  getStoreStateFromFirestore,
  saveStoreStateToFirestore,
  deleteProductFromFirestore,
  subscribeToStoreState,
} from "../utils/firebase";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToStoreState((fsState) => {
      if (fsState && Array.isArray(fsState.products)) setProducts(fsState.products);
    });
    return unsubscribe;
  }, []);

  const persistProducts = async (nextProducts: Product[]) => {
    const current = await getStoreStateFromFirestore();
    if (!current) throw new Error("تعذر تحميل بيانات المتجر من Firestore.");
    const nextState: StoreState = {
      ...current,
      updatedAt: Date.now(),
      products: nextProducts,
    };
    const saved = await saveStoreStateToFirestore(nextState, current.updatedAt || 0);
    if (!saved) throw new Error("فشل حفظ المنتجات على Firestore.");
    setProducts(nextProducts);
  };

  const addProduct = async (p: Partial<Product>) => {
    const current = await getStoreStateFromFirestore();
    if (!current) throw new Error("تعذر تحميل بيانات المتجر من Firestore.");
    const newProduct: Product = {
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: p.name || "",
      category: p.category || "أطقم",
      price: p.price ?? null,
      sizes: p.sizes || "",
      soldOut: !!p.soldOut,
      image: p.image || "",
    };
    await persistProducts([newProduct, ...current.products]);
  };

  const updateProduct = async (id: string, changes: Partial<Product>) => {
    const current = await getStoreStateFromFirestore();
    if (!current) throw new Error("تعذر تحميل بيانات المتجر من Firestore.");
    const updated = current.products.map((product) =>
      product.id === id ? { ...product, ...changes } : product
    );
    await persistProducts(updated);
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("متأكد من الحذف؟")) return;
    const current = await getStoreStateFromFirestore();
    if (!current) throw new Error("تعذر تحميل بيانات المتجر من Firestore.");
    const deleted = await deleteProductFromFirestore(id, Date.now());
    if (!deleted) throw new Error("فشل حذف المنتج من Firestore.");
    setProducts(current.products.filter((product) => product.id !== id));
  };

  return { products, addProduct, updateProduct, deleteProduct };
}
