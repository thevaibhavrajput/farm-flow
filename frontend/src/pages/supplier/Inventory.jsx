import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/api.js';
import {
  Plus, Edit2, Trash2, Tag, Archive,
  Check, X, Upload, Loader2, CheckCircle, AlertCircle,
  Sun, Moon, Calendar, ChevronLeft, ChevronRight,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';
// import Sidebar from '../../components/layout/Sidebar.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useSocket } from '../../context/SocketContext.jsx';

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
// Date Picker Dropdown Component
// ─────────────────────────────────────────────

const DatePickerDropdown = ({ availableDateKeys, selectedDateKey, onSelect, onClear }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [open, setOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    if (selectedDateKey) return new Date(selectedDateKey + 'T00:00:00');
    return new Date();
  });
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const year = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  const prevMonth = () => setCalMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCalMonth(new Date(year, month + 1, 1));

  const isoKey = (d) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const hasProducts = (d) => availableDateKeys.includes(isoKey(d));

  const label = selectedDateKey
    ? new Date(selectedDateKey + 'T00:00:00').toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Filter by date';

  // Theme-aware tokens
  const dropdownBg    = isDark ? '#1e2b1e' : '#fff';
  const dropdownBorder = isDark ? 'rgba(74,124,89,0.30)' : 'rgba(74,124,89,0.18)';
  const dropdownShadow = isDark ? '0 8px 32px rgba(0,0,0,0.45)' : '0 8px 32px rgba(0,0,0,0.13)';
  const headerColor   = isDark ? '#d4e8d4' : '#222';
  const navBtnColor   = isDark ? '#6a9b7a' : '#8a9b8a';
  const weekdayColor  = isDark ? '#5a7a5a' : '#aaa';
  const inactiveDayColor = isDark ? '#3a4a3a' : '#ccc';
  const hintColor     = isDark ? '#5a7a5a' : '#aaa';
  const activeDayBg   = isDark ? 'rgba(74,124,89,0.22)' : 'rgba(74,124,89,0.12)';
  const clearBtnColor = isDark ? '#6a7a6a' : '#aaa';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          background: selectedDateKey
            ? isDark ? 'rgba(74,124,89,0.2)' : 'rgba(74,124,89,0.1)'
            : isDark ? 'rgba(255,255,255,0.04)' : 'transparent',
          border: `1.5px solid ${selectedDateKey ? 'var(--primary-green)' : isDark ? 'rgba(74,124,89,0.35)' : 'rgba(74,124,89,0.25)'}`,
          borderRadius: 10,
          padding: '5px 13px',
          fontSize: 13,
          fontWeight: 600,
          color: selectedDateKey ? 'var(--primary-green)' : isDark ? '#6a9b7a' : '#8a9b8a',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }}
      >
        <Calendar size={15} style={{ flexShrink: 0 }} />
        {label}
        {selectedDateKey && (
          <span
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            style={{
              marginLeft: 2,
              lineHeight: 1,
              color: clearBtnColor,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={13} />
          </span>
        )}
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            zIndex: 9999,
            background: dropdownBg,
            border: `1px solid ${dropdownBorder}`,
            borderRadius: 14,
            boxShadow: dropdownShadow,
            padding: '14px 16px 12px',
            minWidth: 260,
            userSelect: 'none',
          }}
        >
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <button onClick={prevMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: navBtnColor, padding: 2 }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: 13, fontWeight: 700, color: headerColor }}>
              {calMonth.toLocaleString('default', { month: 'long' })} {year}
            </span>
            <button onClick={nextMonth} style={{ background: 'none', border: 'none', cursor: 'pointer', color: navBtnColor, padding: 2 }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: weekdayColor, padding: '2px 0' }}>{d}</div>
            ))}
          </div>

          {/* Thin divider */}
          <div style={{ height: 1, background: isDark ? 'rgba(74,124,89,0.15)' : 'rgba(74,124,89,0.08)', marginBottom: 6 }} />

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {/* Empty cells before first day */}
            {Array.from({ length: startDay }).map((_, i) => <div key={`e-${i}`} />)}

            {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
              const key = isoKey(d);
              const active = hasProducts(d);
              const selected = key === selectedDateKey;
              return (
                <button
                  key={d}
                  onClick={() => {
                    if (!active) return;
                    onSelect(key);
                    setOpen(false);
                  }}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: selected ? 800 : active ? 600 : 400,
                    cursor: active ? 'pointer' : 'default',
                    background: selected
                      ? 'var(--primary-green)'
                      : active
                      ? activeDayBg
                      : 'transparent',
                    color: selected
                      ? '#fff'
                      : active
                      ? 'var(--primary-green)'
                      : inactiveDayColor,
                    position: 'relative',
                    transition: 'all 0.12s',
                  }}
                >
                  {d}
                  {/* Dot indicator for dates with products */}
                  {active && !selected && (
                    <span style={{
                      position: 'absolute',
                      bottom: 2,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 4,
                      height: 4,
                      borderRadius: '50%',
                      background: 'var(--primary-green)',
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div style={{ marginTop: 10, fontSize: 11, color: hintColor, textAlign: 'center', borderTop: `1px solid ${isDark ? 'rgba(74,124,89,0.12)' : 'rgba(74,124,89,0.07)'}`, paddingTop: 8 }}>
            Highlighted dates have products
          </div>
        </div>
      )}
    </div>
  );
};

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
  const socket = useSocket();
  const today = getCurrentDate();

  // ── Modal / editing state ──
  const [showAddModal, setShowAddModal]   = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(() => EMPTY_FORM());

  // ── Bulk adder state ──
  const [showBulkAdd, setShowBulkAdd]   = useState(false);
  const [bulkProducts, setBulkProducts] = useState([]);
  const [saveProgress, setSaveProgress] = useState(null);

  // ── Date filter ──
  const [filterDateKey, setFilterDateKey] = useState(null);

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

  // Derive all available date keys from product data
  const allGrouped = groupProductsByDate(productData || []);
  const availableDateKeys = allGrouped
    .map(g => g.dateKey)
    .filter(k => k !== 'unknown');

  // Apply date filter
  const displayedGroups = filterDateKey
    ? allGrouped.filter(g => g.dateKey === filterDateKey)
    : allGrouped;

  // Auto-seed group discounts from product data on first load.
  useEffect(() => {
    if (!productData?.length) return;
    const grouped = groupProductsByDate(productData);
    setGroupDiscounts(prev => {
      const next = { ...prev };
      let changed = false;
      grouped.forEach(({ dateKey, products: group }) => {
        if (next[dateKey]) return;
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

  useEffect(() => {
    if (!socket) return;

    const handleStockUpdate = () => {
      queryClient.invalidateQueries(['supplierProducts']);
    };

    socket.on('stock:updated', handleStockUpdate);

    return () => {
      socket.off('stock:updated', handleStockUpdate);
    };
  }, [socket, queryClient]);

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
      {/* <Sidebar /> */}
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
              {displayedGroups.map(({ dateKey, products: group }) => {
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

                          {/* ── Date Picker ── */}
                          <DatePickerDropdown
                            availableDateKeys={availableDateKeys}
                            selectedDateKey={filterDateKey}
                            onSelect={(key) => setFilterDateKey(key)}
                            onClear={() => setFilterDateKey(null)}
                          />

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
                    <div className="card-farm" style={{ overflow: 'hidden' }}>
                      {/* Header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '64px 1fr 120px 180px 130px 120px 88px',
                        padding: '10px 20px',
                        gap: 12,
                        background: 'rgba(74,124,89,0.06)',
                        borderBottom: '1px solid rgba(74,124,89,0.12)',
                      }}>
                        {['Image','Product','Category','Price','Stock','Status',''].map((h, i) => (
                          <div key={i} style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: 'var(--primary-green)',
                            opacity: 0.75,
                          }}>{h}</div>
                        ))}
                      </div>

                      {/* Rows */}
                      {group.map((product, rowIdx) => {
                        const productDiscount = getProductDiscountPct(product);
                        const effectiveDiscount = productDiscount > 0 ? productDiscount : gDiscount;
                        const discountSource =
                          productDiscount > 0 && gDiscount > 0 ? 'own'
                          : productDiscount === 0 && gDiscount > 0 ? 'bulk'
                          : null;
                        const isLast = rowIdx === group.length - 1;

                        return (
                          <div
                            key={product._id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '64px 1fr 120px 180px 130px 120px 88px',
                              padding: '13px 20px',
                              gap: 12,
                              alignItems: 'center',
                              borderBottom: isLast ? 'none' : '1px solid rgba(74,124,89,0.07)',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,124,89,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {/* Image */}
                            <div>
                              <img
                                src={product.images?.[0]?.url || 'https://via.placeholder.com/80?text=No+Image'}
                                alt={product.name}
                                style={{
                                  width: 46, height: 46,
                                  objectFit: 'cover',
                                  borderRadius: 10,
                                  border: '1.5px solid rgba(74,124,89,0.15)',
                                  display: 'block',
                                }}
                              />
                            </div>

                            {/* Product name + description */}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)', lineHeight: 1.3 }}>
                                {product.name}
                              </div>
                              {product.description && (
                                <div style={{
                                  fontSize: 11, color: '#8a9b8a', marginTop: 2,
                                  overflow: 'hidden', textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap', maxWidth: 180,
                                }}>
                                  {product.description}
                                </div>
                              )}
                            </div>

                            {/* Category pill */}
                            <div>
                              <span style={{
                                display: 'inline-block', fontSize: 11, fontWeight: 600,
                                color: 'var(--primary-green)', background: 'rgba(74,124,89,0.09)',
                                borderRadius: 20, padding: '3px 10px',
                              }}>
                                {product.category?.name || 'Produce'}
                              </span>
                            </div>

                            {/* Price */}
                            <div>
                              <PriceCell
                                price={product.price}
                                unit={product.unit}
                                effectiveDiscount={effectiveDiscount}
                                discountSource={discountSource}
                              />
                            </div>

                            {/* Stock */}
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>
                              {product.stock?.quantity}
                              <span style={{ fontSize: 11, fontWeight: 400, color: '#8a9b8a', marginLeft: 4 }}>
                                {product.unit}
                              </span>
                            </div>

                            {/* Status */}
                            <div>
                              {product.stock?.quantity > 10 ? (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  fontSize: 11, fontWeight: 600, color: '#2d7a47',
                                  background: 'rgba(45,122,71,0.1)', borderRadius: 20, padding: '3px 10px',
                                }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2d7a47', flexShrink: 0 }} />
                                  In Stock
                                </span>
                              ) : (
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: 5,
                                  fontSize: 11, fontWeight: 600, color: '#a06000',
                                  background: 'rgba(160,96,0,0.1)', borderRadius: 20, padding: '3px 10px',
                                }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e07b39', flexShrink: 0 }} />
                                  Low Stock
                                </span>
                              )}
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => openEditModal(product)}
                                title="Edit"
                                style={{
                                  width: 32, height: 32,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  border: '1.5px solid rgba(74,124,89,0.3)', borderRadius: 8,
                                  background: 'transparent', color: 'var(--primary-green)',
                                  cursor: 'pointer', transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,124,89,0.1)'; e.currentTarget.style.borderColor = 'var(--primary-green)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(74,124,89,0.3)'; }}
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => deleteMutation.mutate(product._id)}
                                title="Delete"
                                style={{
                                  width: 32, height: 32,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  border: '1.5px solid rgba(220,53,69,0.25)', borderRadius: 8,
                                  background: 'transparent', color: '#dc3545',
                                  cursor: 'pointer', transition: 'all 0.15s',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,53,69,0.08)'; e.currentTarget.style.borderColor = '#dc3545'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(220,53,69,0.25)'; }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}

              {/* Empty state when filter yields no results */}
              {filterDateKey && displayedGroups.length === 0 && (
                <div className="card-farm p-5 text-center text-muted">
                  No products found for the selected date.
                  <button className="btn btn-link p-0 ms-2" onClick={() => setFilterDateKey(null)}>Clear filter</button>
                </div>
              )}
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
