import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/api.js';
import {
  Plus, Edit2, Trash2, Tag, Archive,
  Check, X, Upload, Loader2, CheckCircle, AlertCircle,
  Sun, Moon,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';
import Sidebar from '../../components/layout/Sidebar.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

// ─────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────

const getCurrentDate = () => {
  const now = new Date();
  return {
    day: now.getDate(),
    month: now.toLocaleString('default', { month: 'long' }),
    year: now.getFullYear(),
    weekday: now.toLocaleString('default', { weekday: 'short' }),
  };
};

const formatDateLabel = (dateStr) => {
  const d = new Date(dateStr);
  return {
    weekday: d.toLocaleString('default', { weekday: 'long' }),
    day: d.getDate(),
    month: d.toLocaleString('default', { month: 'long' }),
    year: d.getFullYear(),
  };
};

const getDateKey = (dateStr) => new Date(dateStr).toISOString().split('T')[0];

const groupProductsByDate = (products) => {
  if (!products?.length) return [];
  const map = {};
  const order = [];
  products.forEach((p) => {
    const key = p.createdAt ? getDateKey(p.createdAt) : 'unknown';
    if (!map[key]) { map[key] = []; order.push(key); }
    map[key].push(p);
  });
  order.sort((a, b) =>
    a === 'unknown' ? 1 : b === 'unknown' ? -1 : b.localeCompare(a)
  );
  return order.map((key) => ({ dateKey: key, products: map[key] }));
};

// Compute discount breakdown from a base price + discount %
const calcDiscount = (basePrice, discountPct) => {
  const base = parseFloat(basePrice) || 0;
  const pct  = parseFloat(discountPct) || 0;
  const saved = Math.round(((pct / 100) * base) * 100) / 100;
  const final = Math.round((base - saved) * 100) / 100;
  return { base, pct, saved, final };
};

const hasValidDiscount = (price, discount) =>
  parseFloat(price) > 0 && parseFloat(discount) > 0;

// Extract discount percentage from a product's discount subdocument
const getProductDiscountPct = (product) =>
  product.discount?.isActive && product.discount?.type === 'percentage'
    ? (parseFloat(product.discount.value) || 0)
    : 0;

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** Inline price cell — shows strikethrough + savings + final when discounted */
const PriceCell = ({ price, unit, effectiveDiscount, discountSource }) => {
  const { base, pct, saved, final } = calcDiscount(price, effectiveDiscount);
  if (!hasValidDiscount(price, effectiveDiscount)) {
    return <span>₹{(parseFloat(price) || 0).toFixed(2)} / {unit}</span>;
  }

  return (
    <div
      style={{
        background: 'rgba(74,124,89,0.05)',
        border: '1px solid rgba(74,124,89,0.15)',
        borderRadius: '10px',
        padding: '6px 10px',
        lineHeight: 1.55,
        minWidth: '130px',
      }}
    >
      <div style={{ fontSize: '11px', color: '#aaa', textDecoration: 'line-through' }}>
        ₹{base.toFixed(2)} / {unit}
      </div>
      <div className="d-flex align-items-center gap-1" style={{ fontSize: '11px', color: '#e07b39', fontWeight: 600 }}>
        <span>− ₹{saved.toFixed(2)}</span>
        <span style={{ background: 'rgba(224,123,57,0.12)', borderRadius: '4px', padding: '0 5px', fontSize: '10px' }}>
          {pct}% off
        </span>
        {discountSource && (
          <span style={{ color: '#aaa', fontWeight: 400, fontSize: '10px' }}>· {discountSource}</span>
        )}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary-green)' }}>
        ₹{final.toFixed(2)} / {unit}
      </div>
    </div>
  );
};

/** Live discount preview bar used inside the Add/Edit modal */
const DiscountPreview = ({ price, discount }) => {
  if (!hasValidDiscount(price, discount)) return null;
  const { base, pct, saved, final } = calcDiscount(price, discount);
  return (
    <div
      className="d-flex align-items-center gap-3 mt-2 px-3 py-2"
      style={{
        background: 'rgba(74,124,89,0.06)',
        border: '1px solid rgba(74,124,89,0.18)',
        borderRadius: '10px',
        fontSize: '13px',
        flexWrap: 'wrap',
      }}
    >
      <span style={{ color: '#aaa', textDecoration: 'line-through' }}>₹{base.toFixed(2)}</span>
      <span style={{ color: '#ccc' }}>→</span>
      <span style={{ color: '#e07b39', fontWeight: 600, background: 'rgba(224,123,57,0.1)', borderRadius: '6px', padding: '1px 7px' }}>
        − ₹{saved.toFixed(2)} ({pct}% off)
      </span>
      <span style={{ color: '#ccc' }}>→</span>
      <span style={{ fontWeight: 700, color: 'var(--primary-green)', fontSize: '14px' }}>₹{final.toFixed(2)}</span>
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

const EMPTY_BULK_ROW = (categoryId = '') => ({
  id: Date.now() + Math.random(),
  name: '',
  price: '',
  unit: 'kg',
  category: categoryId,
  stock: '',
  discount: '',
  description: '',
  images: null,
  imagePreview: '',
});

const EMPTY_FORM = () => ({
  name: '',
  price: '',
  stock: '',
  unit: 'kg',
  category: '',
  description: '',
  discount: '',
  imageFiles: [],
});

const SupplierInventory = () => {
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  const today = getCurrentDate();

  // ── Modal / editing state ──
  const [showAddModal, setShowAddModal]   = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(() => EMPTY_FORM());

  // ── Bulk adder state ──
  const [showBulkAdd, setShowBulkAdd]   = useState(false);
  const [bulkProducts, setBulkProducts] = useState([]);
  const [saveProgress, setSaveProgress] = useState(null);

  // ── Group discounts — persisted in localStorage ──
  const [groupDiscounts, setGroupDiscounts] = useState(() => {
    try {
      const stored = localStorage.getItem('supplierGroupDiscounts');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const updateGroupDiscount = (dateKey, val) => {
    setGroupDiscounts(prev => {
      const next = { ...prev, [dateKey]: val };
      try { localStorage.setItem('supplierGroupDiscounts', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // ── Queries ──
  const { data: productData, isLoading } = useQuery({
    queryKey: ['supplierProducts'],
    queryFn: async () => {
      const res = await api.get('/products/my-products');
      return res.data.data.products;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.data.categories;
    },
  });

  // Auto-seed group discounts from product data on first load.
  // FIX: p.discount is a subdocument { isActive, type, value } — not a plain
  // number, so we must use getProductDiscountPct() instead of parseFloat(p.discount).
  useEffect(() => {
    if (!productData?.length) return;
    const grouped = groupProductsByDate(productData);
    setGroupDiscounts(prev => {
      const next = { ...prev };
      let changed = false;
      grouped.forEach(({ dateKey, products: group }) => {
        if (next[dateKey]) return; // don't overwrite user-set values
        const discounts = group.map(p => getProductDiscountPct(p));
        const allSame = discounts.every(d => d > 0 && d === discounts[0]);
        if (allSame) { next[dateKey] = discounts[0]; changed = true; }
      });
      if (changed) {
        try { localStorage.setItem('supplierGroupDiscounts', JSON.stringify(next)); } catch {}
        return next;
      }
      return prev;
    });
  }, [productData]);

  // ── Mutations ──
  const addMutation = useMutation({
    mutationFn: (formData) => api.post('/products', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { queryClient.invalidateQueries(['supplierProducts']); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, formData }) => api.put(`/products/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { queryClient.invalidateQueries(['supplierProducts']); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/products/${id}`),
    onSuccess: () => queryClient.invalidateQueries(['supplierProducts']),
  });

  // Saves a bulk discount % to every product in a date group
  const bulkDiscountMutation = useMutation({
    mutationFn: async ({ products, discount }) => {
      await Promise.all(
        products.map((p) => {
          const fd = new FormData();
          fd.append('name',                  p.name);
          fd.append('price',                 p.price);
          fd.append('unit',                  p.unit);
          fd.append('category',              p.category?._id || p.category || '');
          fd.append('description',           p.description || '');
          fd.append('stock[quantity]',       p.stock?.quantity ?? 0);
          fd.append('stock[trackInventory]', 'true');
          fd.append('discount',              discount);
          return api.put(`/products/${p._id}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        })
      );
    },
    onSuccess: () => queryClient.invalidateQueries(['supplierProducts']),
  });

  // ── Form helpers ──
  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const closeModal = () => {
    setShowAddModal(false);
    setEditingProduct(null);
    setForm(EMPTY_FORM());
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    // Extract the percentage value from the discount subdocument
    const discountValue = product.discount?.isActive && product.discount?.type === 'percentage'
      ? String(product.discount.value ?? '')
      : '';

    setForm({
      name:        String(product.name ?? ''),
      price:       String(product.price ?? ''),
      stock:       String(product.stock?.quantity ?? 0),
      unit:        product.unit || 'kg',
      category:    product.category?._id || product.category || '',
      description: product.description || '',
      discount:    discountValue,
      imageFiles:  [],
    });
  };

  // Accepts current form snapshot to avoid stale closure
  const buildFormData = (snapshot) => {
    const fd = new FormData();
    fd.append('name',                  snapshot.name.trim());
    fd.append('price',                 snapshot.price);
    fd.append('unit',                  snapshot.unit);
    fd.append('category',              snapshot.category || categories[0]?._id || '');
    fd.append('description',           snapshot.description);
    fd.append('stock[quantity]',       snapshot.stock);
    fd.append('stock[trackInventory]', 'true');
    fd.append('discount',              parseFloat(snapshot.discount) || 0);
    snapshot.imageFiles.forEach(file => fd.append('images', file));
    return fd;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setForm(currentForm => {
      const fd = buildFormData(currentForm);
      if (editingProduct) {
        updateMutation.mutate({ id: editingProduct._id, formData: fd });
      } else {
        addMutation.mutate(fd);
      }
      return currentForm;
    });
  };

  // ── Bulk adder helpers ──
  const openBulkAdd = () => {
    setBulkProducts([EMPTY_BULK_ROW(categories[0]?._id)]);
    setShowBulkAdd(true);
  };

  const closeBulkAdd = () => {
    bulkProducts.forEach(p => { if (p.imagePreview) URL.revokeObjectURL(p.imagePreview); });
    setShowBulkAdd(false);
    setBulkProducts([]);
    setSaveProgress(null);
  };

  const addBulkRow    = () => setBulkProducts(prev => [...prev, EMPTY_BULK_ROW(categories[0]?._id)]);
  const removeBulkRow = (id) => { if (bulkProducts.length > 1) setBulkProducts(prev => prev.filter(p => p.id !== id)); };
  const updateBulkRow = (id, field, value) => setBulkProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));

  const handleBulkImage = (id, file) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setBulkProducts(prev => prev.map(p => p.id === id ? { ...p, images: file, imagePreview: url } : p));
  };

  const saveAllBulk = async () => {
    const invalid = bulkProducts.filter(p => !p.name.trim() || !p.price || !p.stock || !p.category);
    if (invalid.length) {
      setSaveProgress({ status: 'error', errors: ['Please fill in Name, Category, Price, and Stock Quantity for all rows.'], total: 0, current: 0 });
      return;
    }

    setSaveProgress({ status: 'saving', total: bulkProducts.length, current: 0, errors: [] });
    const errors = [];

    for (let i = 0; i < bulkProducts.length; i++) {
      const p = bulkProducts[i];
      setSaveProgress(prev => ({ ...prev, current: i + 1 }));
      const fd = new FormData();
      fd.append('name',               p.name.trim());
      fd.append('price',              p.price);
      fd.append('unit',               p.unit);
      fd.append('category',           p.category);
      fd.append('description',        p.description.trim());
      fd.append('stock[quantity]',    p.stock);
      fd.append('stock[trackInventory]', 'true');
      fd.append('discount',           p.discount || 0);
      if (p.images) fd.append('images', p.images);

      try {
        await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } catch (err) {
        errors.push(err.response?.data?.message || `Failed to save "${p.name || `Row ${i + 1}`}"`);
      }
    }

    if (errors.length) {
      setSaveProgress(prev => ({ ...prev, status: 'error', errors }));
    } else {
      setSaveProgress(prev => ({ ...prev, status: 'completed' }));
      queryClient.invalidateQueries(['supplierProducts']);
      setTimeout(closeBulkAdd, 1500);
    }
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="container-fluid p-0 animate-fade-in">

          {/* ── Page header ── */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold mb-0">Inventory Management</h2>
            <button className="btn btn-primary-farm d-flex align-items-center gap-2" onClick={openBulkAdd}>
              <Plus size={18} /> Add Product
            </button>
          </div>

          {/* ── Product list ── */}
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status" />
            </div>
          ) : !productData?.length ? (
            <div className="card-farm p-5 text-center text-muted">No products found in inventory</div>
          ) : (
            <div className="d-flex flex-column gap-4">
              {groupProductsByDate(productData).map(({ dateKey, products: group }) => {
                const label = dateKey !== 'unknown' ? formatDateLabel(dateKey) : null;
                const gDiscount = parseFloat(groupDiscounts[dateKey]) || 0;

                return (
                  <div key={dateKey}>

                    {/* ── Date header row ── */}
                    <div className="d-flex align-items-center gap-3 mb-3">
                      {label ? (
                        <>
                          {/* Day block */}
                          <div
                            className="d-flex flex-column align-items-center justify-content-center"
                            style={{ width: 52, height: 52, background: 'var(--primary-green)', borderRadius: 12, flexShrink: 0 }}
                          >
                            <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{label.day}</span>
                            <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {label.month.slice(0, 3)}
                            </span>
                          </div>

                          {/* Weekday + date */}
                          <div style={{ lineHeight: 1.35 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)' }}>{label.weekday}</div>
                            <div style={{ fontSize: 12, color: '#8a9b8a', fontWeight: 500 }}>
                              {label.day} {label.month} {label.year}
                              <span className="ms-2 px-2" style={{ background: 'rgba(74,124,89,0.1)', color: 'var(--primary-green)', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                                {group.length} {group.length === 1 ? 'product' : 'products'}
                              </span>
                            </div>
                          </div>

                          {/* Divider */}
                          <div style={{ flex: 1, height: 1, background: 'rgba(74,124,89,0.15)' }} />

                          {/* ── Bulk discount input ── */}
                          <div className="d-flex align-items-center gap-2 px-3 py-2">
                            <Tag size={15} style={{ color: gDiscount > 0 ? 'var(--primary-green)' : '#aaa', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#8a9b8a', whiteSpace: 'nowrap' }}>Bulk Discount</span>

                            <div className="input-group input-group-sm" style={{ width: 90 }}>
                              <input
                                type="number"
                                className="form-control"
                                placeholder="0"
                                min="0"
                                max="100"
                                step="0.1"
                                value={groupDiscounts[dateKey] || ''}
                                onChange={(e) => {
                                  const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                  updateGroupDiscount(dateKey, val || '');
                                }}
                                onBlur={(e) => {
                                  const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0));
                                  bulkDiscountMutation.mutate({ products: group, discount: val });
                                }}
                                style={{
                                  border: 'none',
                                  borderBottom: `2px solid ${gDiscount > 0 ? 'var(--primary-green)' : '#ddd'}`,
                                  borderRadius: 0,
                                  background: 'transparent',
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: gDiscount > 0 ? 'var(--primary-green)' : 'var(--text-dark)',
                                  padding: '0 2px',
                                  textAlign: 'center',
                                  outline: 'none',
                                  boxShadow: 'none',
                                }}
                              />
                              <span style={{
                                fontSize: 13, fontWeight: 700,
                                color: gDiscount > 0 ? 'var(--primary-green)' : '#aaa',
                                paddingLeft: 2, background: 'transparent',
                                border: 'none',
                                borderBottom: `2px solid ${gDiscount > 0 ? 'var(--primary-green)' : '#ddd'}`,
                                borderRadius: 0, lineHeight: '1.8',
                              }}>%</span>
                            </div>

                            {bulkDiscountMutation.isPending && (
                              <Loader2 size={13} style={{ color: 'var(--primary-green)', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                            )}
                            {gDiscount > 0 && !bulkDiscountMutation.isPending && (
                              <span style={{ fontSize: 11, color: '#e07b39', fontWeight: 600, whiteSpace: 'nowrap', background: 'rgba(224,123,57,0.1)', borderRadius: 8, padding: '1px 7px' }}>
                                off all
                              </span>
                            )}
                            {gDiscount > 0 && (
                              <button
                                className="btn p-0 d-flex align-items-center"
                                style={{ color: '#aaa', lineHeight: 1 }}
                                onClick={() => {
                                  updateGroupDiscount(dateKey, '');
                                  bulkDiscountMutation.mutate({ products: group, discount: 0 });
                                }}
                                title="Clear discount"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>Date unknown</div>
                      )}
                    </div>

                    {/* ── Products table ── */}
                    <div className="card-farm p-3">
                      <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0" style={{ fontSize: 14 }}>
                          <thead>
                            <tr>
                              <th>Product Image</th>
                              <th>Product Name</th>
                              <th>Category</th>
                              <th>Unit Price</th>
                              <th>Stock Quantity</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.map((product) => {
                              // FIX: use subdocument-aware helper instead of parseFloat(product.discount)
                              const productDiscount = getProductDiscountPct(product);
                              const effectiveDiscount = productDiscount > 0 ? productDiscount : gDiscount;
                              const discountSource =
                                productDiscount > 0 && gDiscount > 0 ? 'own'
                                : productDiscount === 0 && gDiscount > 0 ? 'bulk'
                                : null;

                              return (
                                <tr key={product._id}>
                                  <td>
                                    <img
                                      src={product.images?.[0]?.url || 'https://via.placeholder.com/80?text=No+Image'}
                                      alt={product.name}
                                      className="rounded-3"
                                      width="50"
                                      height="50"
                                      style={{ objectFit: 'cover' }}
                                    />
                                  </td>
                                  <td className="fw-semibold">{product.name}</td>
                                  <td>{product.category?.name || 'Produce'}</td>
                                  <td>
                                    <PriceCell
                                      price={product.price}
                                      unit={product.unit}
                                      effectiveDiscount={effectiveDiscount}
                                      discountSource={discountSource}
                                    />
                                  </td>
                                  <td>{product.stock?.quantity} {product.unit}</td>
                                  <td>
                                    <span className={`badge ${product.stock?.quantity > 10 ? 'bg-success' : 'bg-warning text-dark'}`}>
                                      {(product.stockStatus || 'in_stock').replace(/_/g, ' ')}
                                    </span>
                                  </td>
                                  <td>
                                    <div className="d-flex gap-2">
                                      <button className="btn btn-outline-success btn-sm" onClick={() => openEditModal(product)}>
                                        <Edit2 size={14} />
                                      </button>
                                      <button className="btn btn-outline-danger btn-sm" onClick={() => deleteMutation.mutate(product._id)}>
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════
            Add / Edit Modal
        ════════════════════════════════════════ */}
        {(showAddModal || editingProduct) && createPortal(
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 card-farm shadow-lg p-4">

                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold text-success">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h5>
                  <button type="button" className="btn-close" onClick={closeModal} />
                </div>

                <form onSubmit={handleSubmit} className="modal-body pt-3">

                  {/* Name */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Product Name</label>
                    <input type="text" className="form-control" placeholder="e.g. Tomatoes"
                      value={form.name} onChange={(e) => setField('name', e.target.value)} required />
                  </div>

                  {/* Price + Unit */}
                  <div className="row g-3 mb-3">
                    <div className="col-sm-6">
                      <label className="form-label fw-semibold">Price (₹)</label>
                      <input type="number" className="form-control" placeholder="50"
                        value={form.price} onChange={(e) => setField('price', e.target.value)} required />
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label fw-semibold">Unit</label>
                      <select className="form-select" value={form.unit} onChange={(e) => setField('unit', e.target.value)}>
                        <option value="kg">Kg</option>
                        <option value="gram">Gram</option>
                        <option value="piece">Piece</option>
                        <option value="dozen">Dozen</option>
                        <option value="box">Box</option>
                        <option value="crate">Crate</option>
                        <option value="bundle">Bundle</option>
                      </select>
                    </div>
                  </div>

                  {/* Category + Stock */}
                  <div className="row g-3 mb-3">
                    <div className="col-sm-6">
                      <label className="form-label fw-semibold">Category</label>
                      <select className="form-select" value={form.category} onChange={(e) => setField('category', e.target.value)}>
                        {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="col-sm-6">
                      <label className="form-label fw-semibold">Stock Quantity</label>
                      <input type="number" className="form-control" placeholder="100"
                        value={form.stock} onChange={(e) => setField('stock', e.target.value)} required />
                    </div>
                  </div>

                  {/* Discount */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Discount (%)</label>
                    <div className="input-group">
                      <input
                        type="number" className="form-control" placeholder="0"
                        min="0" max="100" step="0.1"
                        value={form.discount}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '' || raw === null) { setField('discount', ''); return; }
                          const num = parseFloat(raw);
                          if (isNaN(num)) { setField('discount', ''); return; }
                          setField('discount', String(Math.min(100, Math.max(0, num))));
                        }}
                      />
                      <span
                        className="input-group-text"
                        style={{
                          background: parseFloat(form.discount) > 0 ? 'rgba(74,124,89,0.08)' : undefined,
                          color: parseFloat(form.discount) > 0 ? 'var(--primary-green)' : undefined,
                          fontWeight: 700,
                          borderColor: 'var(--border-color)',
                        }}
                      >%</span>
                    </div>
                    <DiscountPreview price={form.price} discount={form.discount} />
                  </div>

                  {/* Description */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Description</label>
                    <textarea className="form-control" rows="3" placeholder="Fresh organic quality..."
                      value={form.description} onChange={(e) => setField('description', e.target.value)} />
                  </div>

                  {/* Images */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Product Images</label>
                    <input type="file" className="form-control" multiple accept="image/*"
                      onChange={(e) => setField('imageFiles', Array.from(e.target.files))} />
                  </div>

                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-light" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="btn btn-primary-farm d-flex align-items-center gap-2"
                      disabled={addMutation.isPending || addMutation.isLoading || updateMutation.isPending || updateMutation.isLoading}
                    >
                      {(addMutation.isPending || addMutation.isLoading || updateMutation.isPending || updateMutation.isLoading) && (
                        <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      )}
                      Save Changes
                    </button>
                  </div>
                </form>

              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ════════════════════════════════════════
            Bulk Add Full-Screen Overlay
        ════════════════════════════════════════ */}
        {showBulkAdd && createPortal(
          <div className="bulk-add-overlay">

            {/* Header */}
            <div className="bulk-add-header d-flex justify-content-between align-items-center">
              <div>
                <h4 className="fw-bold mb-1" style={{ color: 'var(--primary-green)' }}>
                  <Plus size={22} className="me-2" style={{ verticalAlign: '-3px' }} />
                  Add New Products
                </h4>
                <p className="text-muted mb-0" style={{ fontSize: 14 }}>
                  Fill in the details for each product below. You can add multiple at once.
                </p>
              </div>

              <div className="d-flex align-items-center gap-3">
                {/* Theme toggle */}
                <button className="btn btn-outline-success border-0 rounded-circle p-2" onClick={toggleTheme} title="Toggle Theme">
                  {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                {/* Date pill */}
                <div
                  className="d-flex align-items-center gap-2 px-3 py-2"
                  style={{ background: 'rgba(74,124,89,0.07)', border: '1px solid rgba(74,124,89,0.18)', borderRadius: 12 }}
                >
                  <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--primary-green)', lineHeight: 1 }}>{today.day}</span>
                  <div style={{ width: 1, height: 28, background: 'rgba(74,124,89,0.2)' }} />
                  <div style={{ lineHeight: 1.3 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary-green)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{today.month}</div>
                    <div style={{ fontSize: 11, color: '#8a9b8a', fontWeight: 500 }}>{today.year}</div>
                  </div>
                </div>

                {/* Count badge */}
                <span className="badge bg-success bg-opacity-10 text-success px-3 py-2 rounded-pill" style={{ fontSize: 14 }}>
                  {bulkProducts.length} {bulkProducts.length === 1 ? 'Product' : 'Products'}
                </span>

                {/* Close */}
                <button
                  className="btn btn-outline-secondary rounded-circle d-flex align-items-center justify-content-center"
                  style={{ width: 38, height: 38 }}
                  onClick={closeBulkAdd}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bulk-add-content">
              <div className="bulk-table-card">
                <div className="table-responsive">
                  <table className="table mb-0 bulk-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th style={{ minWidth: 160 }}>Produce Name</th>
                        <th style={{ minWidth: 130 }}>Category</th>
                        <th style={{ minWidth: 100 }}>Price (₹)</th>
                        <th style={{ minWidth: 100 }}>Unit</th>
                        <th style={{ minWidth: 100 }}>Stock Qty</th>
                        <th style={{ minWidth: 90 }}>Discount %</th>
                        <th style={{ minWidth: 130 }}>Price Summary</th>
                        <th style={{ minWidth: 180 }}>Description</th>
                        <th style={{ width: 80 }}>Image</th>
                        <th style={{ width: 50 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkProducts.map((product, idx) => {
                        const { base, pct, saved, final } = calcDiscount(product.price, product.discount);
                        return (
                          <tr key={product.id}>
                            <td className="bulk-row-num">{idx + 1}</td>

                            <td>
                              <input type="text" className="form-control bulk-input-field" placeholder="e.g. Tomatoes"
                                value={product.name} onChange={(e) => updateBulkRow(product.id, 'name', e.target.value)} required />
                            </td>

                            <td>
                              <select className="form-select bulk-input-field" value={product.category}
                                onChange={(e) => updateBulkRow(product.id, 'category', e.target.value)}>
                                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                              </select>
                            </td>

                            <td>
                              <input type="number" className="form-control bulk-input-field" placeholder="50"
                                min="0" step="0.01" value={product.price}
                                onChange={(e) => updateBulkRow(product.id, 'price', e.target.value)} required />
                            </td>

                            <td>
                              <select className="form-select bulk-input-field" value={product.unit}
                                onChange={(e) => updateBulkRow(product.id, 'unit', e.target.value)}>
                                <option value="kg">Kg</option>
                                <option value="gram">Gram</option>
                                <option value="piece">Piece</option>
                                <option value="dozen">Dozen</option>
                                <option value="box">Box</option>
                                <option value="crate">Crate</option>
                                <option value="bundle">Bundle</option>
                              </select>
                            </td>

                            <td>
                              <input type="number" className="form-control bulk-input-field" placeholder="100"
                                min="0" value={product.stock}
                                onChange={(e) => updateBulkRow(product.id, 'stock', e.target.value)} required />
                            </td>

                            {/* Discount */}
                            <td>
                              <div className="input-group input-group-sm">
                                <input
                                  type="number" className="form-control bulk-input-field" placeholder="0"
                                  min="0" max="100" step="0.1"
                                  value={product.discount || ''}
                                  onChange={(e) => updateBulkRow(product.id, 'discount', e.target.value)}
                                  style={{ borderRight: 'none' }}
                                />
                                <span className="input-group-text" style={{
                                  background: 'rgba(74,124,89,0.08)',
                                  border: '1px solid var(--border-color)',
                                  borderLeft: 'none',
                                  color: 'var(--primary-green)',
                                  fontWeight: 700,
                                  fontSize: 13,
                                }}>%</span>
                              </div>
                            </td>

                            {/* Price summary */}
                            <td>
                              {base > 0 ? (
                                <div style={{
                                  background: pct > 0 ? 'rgba(74,124,89,0.06)' : 'transparent',
                                  border: `1px solid ${pct > 0 ? 'rgba(74,124,89,0.18)' : 'transparent'}`,
                                  borderRadius: 10,
                                  padding: pct > 0 ? '6px 10px' : 0,
                                  lineHeight: 1.5,
                                  minWidth: 110,
                                }}>
                                  {pct > 0 ? (
                                    <>
                                      <div style={{ fontSize: 11, color: '#aaa', textDecoration: 'line-through' }}>₹{base.toFixed(2)}</div>
                                      <div style={{ fontSize: 11, color: '#e07b39', fontWeight: 600 }}>− ₹{saved.toFixed(2)} ({pct}% off)</div>
                                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-green)' }}>₹{final.toFixed(2)}</div>
                                    </>
                                  ) : (
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>₹{base.toFixed(2)}</div>
                                  )}
                                </div>
                              ) : (
                                <span style={{ fontSize: 12, color: '#bbb' }}>—</span>
                              )}
                            </td>

                            <td>
                              <input type="text" className="form-control bulk-input-field" placeholder="Fresh organic quality..."
                                value={product.description} onChange={(e) => updateBulkRow(product.id, 'description', e.target.value)} />
                            </td>

                            <td>
                              <label className="bulk-image-upload-box" htmlFor={`bulk-img-${product.id}`}>
                                {product.imagePreview
                                  ? <img src={product.imagePreview} alt="Preview" className="bulk-image-preview" />
                                  : <Upload size={18} style={{ color: 'var(--text-muted)' }} />
                                }
                                <input id={`bulk-img-${product.id}`} type="file" accept="image/*" className="d-none"
                                  onChange={(e) => handleBulkImage(product.id, e.target.files[0])} />
                              </label>
                            </td>

                            <td>
                              <button
                                className="btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center"
                                style={{ width: 32, height: 32 }}
                                onClick={() => removeBulkRow(product.id)}
                                title="Remove row"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add row */}
                <div className="p-3 text-center" style={{ borderTop: '1px dashed var(--border-color)' }}>
                  <button className="btn btn-outline-success d-inline-flex align-items-center gap-2"
                    onClick={addBulkRow} style={{ borderRadius: 12, fontWeight: 600 }}>
                    <Plus size={16} /> Add Another Product
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bulk-add-footer">
              <div className="text-muted" style={{ fontSize: 14 }}>
                <Archive size={16} className="me-1" style={{ verticalAlign: '-2px' }} />
                {bulkProducts.length} {bulkProducts.length === 1 ? 'product' : 'products'} ready to save
              </div>
              <div className="d-flex gap-3">
                <button className="btn btn-light px-4" style={{ borderRadius: 12, fontWeight: 600 }} onClick={closeBulkAdd}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary-farm px-4 d-flex align-items-center gap-2"
                  onClick={saveAllBulk}
                  disabled={saveProgress?.status === 'saving'}
                >
                  <Check size={18} /> Save All Products
                </button>
              </div>
            </div>

            {/* Save progress overlay */}
            {saveProgress && createPortal(
              <div className="progress-overlay-backdrop">
                <div className="progress-card text-center">

                  {saveProgress.status === 'saving' && (
                    <>
                      <Loader2 size={48} className="text-success mb-3" style={{ animation: 'spin 1s linear infinite' }} />
                      <h5 className="fw-bold mb-2">Saving Products...</h5>
                      <p className="text-muted mb-3">Saving product {saveProgress.current} of {saveProgress.total}</p>
                      <div className="progress" style={{ height: 8, borderRadius: 4 }}>
                        <div
                          className="progress-bar bg-success"
                          style={{ width: `${(saveProgress.current / saveProgress.total) * 100}%`, transition: 'width 0.3s ease' }}
                        />
                      </div>
                    </>
                  )}

                  {saveProgress.status === 'completed' && (
                    <>
                      <CheckCircle size={48} className="text-success mb-3" />
                      <h5 className="fw-bold text-success mb-2">All Products Saved!</h5>
                      <p className="text-muted">
                        {saveProgress.total} {saveProgress.total === 1 ? 'product has' : 'products have'} been added to your inventory.
                      </p>
                    </>
                  )}

                  {saveProgress.status === 'error' && (
                    <>
                      <AlertCircle size={48} className="text-danger mb-3" />
                      <h5 className="fw-bold text-danger mb-2">Some Products Failed</h5>
                      <div className="text-start mb-3" style={{ maxHeight: 150, overflowY: 'auto' }}>
                        {saveProgress.errors.map((err, i) => (
                          <div key={i} className="d-flex align-items-start gap-2 mb-2" style={{ fontSize: 13 }}>
                            <X size={14} className="text-danger mt-1 flex-shrink-0" />
                            <span className="text-muted">{err}</span>
                          </div>
                        ))}
                      </div>
                      <button className="btn btn-primary-farm" onClick={() => setSaveProgress(null)}>Dismiss</button>
                    </>
                  )}

                </div>
              </div>,
              document.body
            )}

          </div>,
          document.body
        )}

      </div>
    </div>
  );
};

export default SupplierInventory;
