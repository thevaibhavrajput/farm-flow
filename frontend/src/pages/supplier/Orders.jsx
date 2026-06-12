import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/api.js';
import {
  Eye, FileDown, Search, SlidersHorizontal,
  X, ChevronDown, ChevronUp, CalendarDays,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';
import { useToast } from '../../components/layout/Toast.jsx';

// ── Date helpers ──────────────────────────────────────────────────────────────

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

const formatOrderTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('default', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const groupOrdersByDate = (orders) => {
  if (!orders?.length) return [];
  const map = {};
  const keys = [];
  orders.forEach((o) => {
    const key = o.createdAt ? getDateKey(o.createdAt) : 'unknown';
    if (!map[key]) { map[key] = []; keys.push(key); }
    map[key].push(o);
  });
  keys.sort((a, b) => (a === 'unknown' ? 1 : b === 'unknown' ? -1 : b.localeCompare(a)));
  return keys.map((key) => ({ dateKey: key, orders: map[key] }));
};

// ── Filter constants ──────────────────────────────────────────────────────────

const STATUS_OPTIONS  = ['pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'];
const PAYMENT_OPTIONS = ['cod', 'upi', 'card', 'netbanking', 'wallet', 'online'];
const ITEMS_RANGES    = [
  { label: 'Any',       min: 0,  max: Infinity },
  { label: '1 item',    min: 1,  max: 1 },
  { label: '2–5 items', min: 2,  max: 5 },
  { label: '6–10 items',min: 6,  max: 10 },
  { label: '10+ items', min: 11, max: Infinity },
];
const PRICE_RANGES = [
  { label: 'Any',            min: 0,    max: Infinity },
  { label: 'Under ₹500',     min: 0,    max: 499 },
  { label: '₹500 – ₹2,000',  min: 500,  max: 2000 },
  { label: '₹2,000 – ₹5,000',min: 2001, max: 5000 },
  { label: '₹5,000+',        min: 5001, max: Infinity },
];

const STATUS_COLORS = {
  pending:          '#f59e0b',
  confirmed:        '#3b82f6',
  processing:       '#8b5cf6',
  packed:           '#06b6d4',
  out_for_delivery: '#f97316',
  delivered:        '#22c55e',
  cancelled:        '#ef4444',
};

const getOrderTableTotal = (order) => {
  const subtotal = order.pricing?.subtotal ?? 0;
  const discount = order.pricing?.discount ?? 0;
  return subtotal - discount;
};

const STATUS_PIPELINE = [
  { key: 'pending',          label: 'Pending',          icon: '🕐' },
  { key: 'confirmed',        label: 'Confirmed',        icon: '✅' },
  { key: 'processing',       label: 'Processing',       icon: '⚙️' },
  { key: 'packed',           label: 'Packed',           icon: '📦' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🚚' },
  { key: 'delivered',        label: 'Delivered',        icon: '🎉' },
];

const getNextAllowedStatus = (currentStatus) => {
  const idx = STATUS_PIPELINE.findIndex(s => s.key === currentStatus);
  if (idx === -1 || idx === STATUS_PIPELINE.length - 1) return null;
  return STATUS_PIPELINE[idx + 1].key;
};

// ── Filter Panel ──────────────────────────────────────────────────────────────

const FilterPanel = ({ filters, setFilters, onClose, anchorRef }) => {
  const panelRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        anchorRef.current && !anchorRef.current.contains(e.target)
      ) onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose, anchorRef]);

  const toggleStatus  = (s) => setFilters(f => ({
    ...f, statuses: f.statuses.includes(s) ? f.statuses.filter(x => x !== s) : [...f.statuses, s],
  }));
  const togglePayment = (p) => setFilters(f => ({
    ...f, payments: f.payments.includes(p) ? f.payments.filter(x => x !== p) : [...f.payments, p],
  }));

  const activeCount =
    filters.statuses.length + filters.payments.length +
    (filters.itemsRange.label !== 'Any' ? 1 : 0) +
    (filters.priceRange.label  !== 'Any' ? 1 : 0) +
    (filters.date ? 1 : 0);

  const sectionLabel = {
    fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px',
  };

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: '340px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        zIndex: 1050,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '13px 16px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--glass-bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SlidersHorizontal size={15} color="var(--primary-green)" />
          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-dark)' }}>Filters</span>
          {activeCount > 0 && (
            <span style={{
              background: 'var(--primary-green)', color: '#fff',
              borderRadius: '20px', fontSize: '11px', fontWeight: 700,
              padding: '1px 7px',
            }}>{activeCount}</span>
          )}
        </div>
        <button
          onClick={() => setFilters({ statuses: [], payments: [], itemsRange: ITEMS_RANGES[0], priceRange: PRICE_RANGES[0], date: '' })}
          style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Clear all
        </button>
      </div>

      <div style={{ padding: '14px 16px', maxHeight: '500px', overflowY: 'auto', background: 'var(--bg-card)' }}>
        {/* Date Picker */}
        <div style={{ marginBottom: '18px' }}>
          <div style={sectionLabel}>Order Date</div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            border: `1.5px solid ${filters.date ? 'var(--primary-green)' : 'var(--border-color)'}`,
            borderRadius: '10px', padding: '7px 10px',
            background: filters.date ? 'rgba(74,124,89,0.07)' : 'var(--bg-cream)',
            transition: 'all 0.2s',
          }}>
            <CalendarDays size={15} color={filters.date ? 'var(--primary-green)' : 'var(--text-muted)'} />
            <input
              type="date"
              value={filters.date || ''}
              onChange={(e) => setFilters(f => ({ ...f, date: e.target.value }))}
              style={{
                flex: 1, border: 'none', outline: 'none',
                background: 'transparent', fontSize: '13px',
                color: filters.date ? 'var(--primary-green)' : 'var(--text-dark)',
                fontWeight: filters.date ? 600 : 400,
                cursor: 'pointer',
              }}
            />
            {filters.date && (
              <button
                onClick={() => setFilters(f => ({ ...f, date: '' }))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--text-muted)' }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Order Status */}
        <div style={{ marginBottom: '18px' }}>
          <div style={sectionLabel}>Order Status</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {STATUS_OPTIONS.map(s => {
              const active = filters.statuses.includes(s);
              const col    = STATUS_COLORS[s];
              return (
                <button key={s} onClick={() => toggleStatus(s)} style={{
                  padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                  border: `1.5px solid ${active ? col : 'var(--border-color)'}`,
                  background: active ? col + '22' : 'transparent',
                  color: active ? col : 'var(--text-muted)',
                }}>
                  {active && '✓ '}{s.replace(/_/g, ' ')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Method */}
        <div style={{ marginBottom: '18px' }}>
          <div style={sectionLabel}>Payment Method</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {PAYMENT_OPTIONS.map(p => {
              const active = filters.payments.includes(p);
              return (
                <button key={p} onClick={() => togglePayment(p)} style={{
                  padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                  border: `1.5px solid ${active ? 'var(--primary-green)' : 'var(--border-color)'}`,
                  background: active ? 'rgba(74,124,89,0.15)' : 'transparent',
                  color: active ? 'var(--primary-green)' : 'var(--text-muted)',
                }}>
                  {active && '✓ '}{p.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Items Count */}
        <div style={{ marginBottom: '18px' }}>
          <div style={sectionLabel}>Items Count</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {ITEMS_RANGES.map(r => {
              const active = filters.itemsRange.label === r.label;
              return (
                <label key={r.label} onClick={() => setFilters(f => ({ ...f, itemsRange: r }))} style={{
                  display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer',
                  padding: '5px 8px', borderRadius: '8px',
                  background: active ? 'rgba(74,124,89,0.12)' : 'transparent',
                  transition: 'background 0.15s',
                }}>
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${active ? 'var(--primary-green)' : 'var(--border-color)'}`,
                    background: active ? 'var(--primary-green)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {active && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: '13px', color: active ? 'var(--primary-green)' : 'var(--text-dark)', fontWeight: active ? 600 : 400 }}>
                    {r.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Total Pricing */}
        <div>
          <div style={sectionLabel}>Total Pricing</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {PRICE_RANGES.map(r => {
              const active = filters.priceRange.label === r.label;
              return (
                <label key={r.label} onClick={() => setFilters(f => ({ ...f, priceRange: r }))} style={{
                  display: 'flex', alignItems: 'center', gap: '9px', cursor: 'pointer',
                  padding: '5px 8px', borderRadius: '8px',
                  background: active ? 'rgba(74,124,89,0.12)' : 'transparent',
                  transition: 'background 0.15s',
                }}>
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${active ? 'var(--primary-green)' : 'var(--border-color)'}`,
                    background: active ? 'var(--primary-green)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {active && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fff' }} />}
                  </div>
                  <span style={{ fontSize: '13px', color: active ? 'var(--primary-green)' : 'var(--text-dark)', fontWeight: active ? 600 : 400 }}>
                    {r.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Status Step Bar ───────────────────────────────────────────────────────────

const StatusStepBar = ({ currentStatus, onAdvance, isLoading, isCancelled }) => {
  const currentIdx = STATUS_PIPELINE.findIndex(s => s.key === currentStatus);
  const nextStatus = getNextAllowedStatus(currentStatus);

  if (isCancelled) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '14px 0', gap: '8px',
        background: 'rgba(239,68,68,0.08)', borderRadius: '12px',
        border: '1.5px solid rgba(239,68,68,0.2)',
      }}>
        <span style={{ fontSize: '18px' }}>🚫</span>
        <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '14px' }}>Order Cancelled</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: '4px' }}>
        {STATUS_PIPELINE.map((step, idx) => {
          const isDone    = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isNext    = step.key === nextStatus;
          const isFuture  = idx > currentIdx;

          let nodeColor  = 'var(--border-color)';
          let nodeBg     = 'var(--bg-card)';
          let textColor  = 'var(--text-muted)';
          let fontWeight = 400;

          if (isDone)    { nodeColor = '#22c55e'; nodeBg = '#22c55e'; textColor = '#22c55e'; fontWeight = 600; }
          if (isCurrent) { nodeColor = STATUS_COLORS[step.key] || 'var(--primary-green)'; nodeBg = STATUS_COLORS[step.key] || 'var(--primary-green)'; textColor = STATUS_COLORS[step.key] || 'var(--primary-green)'; fontWeight = 700; }

          return (
            <React.Fragment key={step.key}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '64px' }}>
                <button
                  disabled={!isNext || isLoading}
                  onClick={() => isNext && onAdvance(step.key)}
                  title={isNext ? `Click to mark as "${step.label}"` : isFuture ? 'Complete previous steps first' : ''}
                  style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    border: `2.5px solid ${nodeColor}`,
                    background: (isDone || isCurrent) ? nodeBg : 'var(--bg-card)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isDone ? '14px' : '15px',
                    cursor: isNext && !isLoading ? 'pointer' : 'default',
                    outline: 'none', transition: 'all 0.2s', position: 'relative',
                    boxShadow: isNext && !isLoading ? `0 0 0 4px ${(STATUS_COLORS[step.key] || 'var(--primary-green)') + '33'}` : 'none',
                  }}
                >
                  {isDone
                    ? <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>✓</span>
                    : <span style={{ fontSize: '13px' }}>{step.icon}</span>
                  }
                  {isNext && !isLoading && (
                    <span style={{
                      position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)',
                      background: STATUS_COLORS[step.key] || 'var(--primary-green)',
                      color: '#fff', fontSize: '8px', fontWeight: 800,
                      padding: '1px 5px', borderRadius: '6px', whiteSpace: 'nowrap', letterSpacing: '0.04em',
                    }}>NEXT</span>
                  )}
                  {isLoading && isNext && (
                    <span style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      border: `3px solid ${nodeColor}`, borderTopColor: 'transparent',
                      animation: 'spin 0.7s linear infinite',
                    }} />
                  )}
                </button>
                <span style={{ marginTop: '5px', fontSize: '10px', fontWeight, color: textColor, textAlign: 'center', lineHeight: 1.2, maxWidth: '60px' }}>
                  {step.label}
                </span>
              </div>
              {idx < STATUS_PIPELINE.length - 1 && (
                <div style={{
                  flex: 1, height: '2.5px', minWidth: '12px',
                  background: idx < currentIdx ? '#22c55e' : 'var(--border-color)',
                  transition: 'background 0.3s', marginBottom: '20px',
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {nextStatus && !isLoading && (
        <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
          Click the <strong style={{ color: STATUS_COLORS[nextStatus] }}>
            {STATUS_PIPELINE.find(s => s.key === nextStatus)?.label}
          </strong> node above to advance this order
        </div>
      )}
      {isLoading && <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>Updating status…</div>}
      {currentStatus === 'delivered' && <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>🎉 Order fully delivered</div>}
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────

const SupplierOrders = () => {
  const queryClient = useQueryClient();
  const showToast   = useToast();

  const [downloadingInvoice, setDownloadingInvoice] = useState(null);
  const [selectedOrder, setSelectedOrder]           = useState(null);
  const [comment, setComment]                       = useState('');
  const [searchQuery, setSearchQuery]               = useState('');
  const [showFilters, setShowFilters]               = useState(false);
  const filterBtnRef = useRef(null);

  const [filters, setFilters] = useState({
    statuses: [], payments: [],
    itemsRange: ITEMS_RANGES[0], priceRange: PRICE_RANGES[0],
    date: '',
  });

  const { data: orderData, isLoading } = useQuery({
    queryKey: ['supplierOrders'],
    queryFn: async () => {
      const response = await api.get('/orders');
      return response.data.data.orders;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, comment }) => api.patch(`/orders/${id}/status`, { status, comment }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['supplierOrders']);
      const updated = res?.data?.data?.order;
      if (updated) setSelectedOrder(updated);
      setComment('');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }) => api.post(`/orders/${id}/cancel`, { reason }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['supplierOrders']);
      const updated = res?.data?.data?.order;
      if (updated) setSelectedOrder(updated);
      setComment('');
    },
  });

  const handleAdvanceStatus = (nextStatus) => {
    if (!selectedOrder) return;
    statusMutation.mutate({ id: selectedOrder._id, status: nextStatus, comment });
  };

  const handleDownloadInvoice = async (id, orderNumber) => {
    try {
      setDownloadingInvoice(id);
      const response = await api.get(`/orders/${id}/invoice`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url  = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `invoice-${orderNumber}.pdf`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast({ title: 'Invoice Downloaded', sub: `Invoice ${orderNumber} downloaded successfully`, variant: 'success', duration: 3000 });
    } catch (error) {
      console.error(error);
      showToast({ title: 'Download Failed', sub: 'Failed to download invoice', variant: 'error', duration: 3000 });
    } finally {
      setDownloadingInvoice(null);
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filteredOrders = (orderData || []).filter((order) => {
    if (searchQuery.trim()) {
      const q     = searchQuery.toLowerCase();
      const biz   = order.buyer?.businessInfo?.businessName?.toLowerCase() || '';
      const first = order.buyer?.firstName?.toLowerCase() || '';
      const last  = order.buyer?.lastName?.toLowerCase() || '';
      if (!biz.includes(q) && !(first + ' ' + last).includes(q) && !first.includes(q)) return false;
    }
    if (filters.statuses.length  > 0 && !filters.statuses.includes(order.status)) return false;
    if (filters.payments.length  > 0 && !filters.payments.includes(order.payment?.method?.toLowerCase())) return false;
    const itemCount = order.items?.length || 0;
    if (itemCount < filters.itemsRange.min || itemCount > filters.itemsRange.max) return false;
    const total = order.pricing?.total || 0;
    if (total < filters.priceRange.min || total > filters.priceRange.max) return false;
    if (filters.date) {
      const placedKey = order.createdAt ? getDateKey(order.createdAt) : '';
      if (placedKey !== filters.date) return false;
    }
    return true;
  });

  const grouped = groupOrdersByDate(filteredOrders);

  const activeFilterCount =
    filters.statuses.length + filters.payments.length +
    (filters.itemsRange.label !== 'Any' ? 1 : 0) +
    (filters.priceRange.label !== 'Any' ? 1 : 0) +
    (filters.date ? 1 : 0);

  const clearAll = () => {
    setFilters({ statuses: [], payments: [], itemsRange: ITEMS_RANGES[0], priceRange: PRICE_RANGES[0], date: '' });
    setSearchQuery('');
  };

  const chipStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '3px 10px', background: 'rgba(74,124,89,0.12)',
    color: 'var(--primary-green)', border: '1px solid rgba(74,124,89,0.2)',
    borderRadius: '20px', fontSize: '12px', fontWeight: 600,
  };
  const chipBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'inherit' };
  const isModalBusy  = statusMutation.isPending || cancelMutation.isPending;

  // ── Grid column definition (mirrors inventory) ────────────────────────────
  // Order No. | Customer | Items | Total | Payment | Status | Actions
  const GRID_COLS = '160px 1fr 100px 120px 130px 150px 90px';

  return (
    <div className="app-container">
      <div className="main-content">
        <Navbar />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

        <div className="container-fluid p-0 animate-fade-in">

          {/* ── Header Row ── */}
          <div className="d-flex align-items-center justify-content-between mb-4" style={{ gap: '12px', flexWrap: 'wrap' }}>
            <h2 className="fw-bold mb-0" style={{ color: 'var(--text-dark)', flexShrink: 0 }}>
              Incoming Customer Orders
            </h2>

            <div className="d-flex align-items-center gap-2" style={{ flex: 1, justifyContent: 'flex-end', minWidth: 0 }}>
              {/* Search Bar */}
              <div style={{ position: 'relative', maxWidth: '260px', width: '100%' }}>
                <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Search by customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', paddingLeft: '34px', paddingRight: searchQuery ? '32px' : '12px',
                    paddingTop: '8px', paddingBottom: '8px', fontSize: '13px',
                    border: '1.5px solid var(--border-color)', borderRadius: '10px', outline: 'none',
                    background: 'var(--bg-card)', color: 'var(--text-dark)', transition: 'border-color 0.2s',
                  }}
                  onFocus={e  => e.target.style.borderColor = 'var(--primary-green)'}
                  onBlur={e   => e.target.style.borderColor = 'var(--border-color)'}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Filter Button */}
              <div style={{ position: 'relative', flexShrink: 0 }} ref={filterBtnRef}>
                <button
                  onClick={() => setShowFilters(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', fontSize: '13px', fontWeight: 600,
                    border: `1.5px solid ${showFilters || activeFilterCount > 0 ? 'var(--primary-green)' : 'var(--border-color)'}`,
                    borderRadius: '10px',
                    background: showFilters || activeFilterCount > 0 ? 'rgba(74,124,89,0.12)' : 'var(--bg-card)',
                    color: showFilters || activeFilterCount > 0 ? 'var(--primary-green)' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                  }}
                >
                  <SlidersHorizontal size={15} />
                  Filters
                  {activeFilterCount > 0 && (
                    <span style={{ background: 'var(--primary-green)', color: '#fff', borderRadius: '20px', fontSize: '10px', fontWeight: 700, padding: '1px 6px', marginLeft: '2px' }}>
                      {activeFilterCount}
                    </span>
                  )}
                  {showFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {showFilters && (
                  <FilterPanel
                    filters={filters}
                    setFilters={setFilters}
                    onClose={() => setShowFilters(false)}
                    anchorRef={filterBtnRef}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {(activeFilterCount > 0 || searchQuery) && (
            <div className="d-flex flex-wrap gap-2 mb-3" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Active:</span>
              {searchQuery && (
                <span style={chipStyle}>
                  "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} style={chipBtnStyle}><X size={11} /></button>
                </span>
              )}
              {filters.date && (
                <span style={chipStyle}>
                  <CalendarDays size={11} />
                  {new Date(filters.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  <button onClick={() => setFilters(f => ({ ...f, date: '' }))} style={chipBtnStyle}><X size={11} /></button>
                </span>
              )}
              {filters.statuses.map(s => (
                <span key={s} style={chipStyle}>
                  {s.replace(/_/g, ' ')}
                  <button onClick={() => setFilters(f => ({ ...f, statuses: f.statuses.filter(x => x !== s) }))} style={chipBtnStyle}><X size={11} /></button>
                </span>
              ))}
              {filters.payments.map(p => (
                <span key={p} style={chipStyle}>
                  {p.toUpperCase()}
                  <button onClick={() => setFilters(f => ({ ...f, payments: f.payments.filter(x => x !== p) }))} style={chipBtnStyle}><X size={11} /></button>
                </span>
              ))}
              {filters.itemsRange.label !== 'Any' && (
                <span style={chipStyle}>
                  {filters.itemsRange.label}
                  <button onClick={() => setFilters(f => ({ ...f, itemsRange: ITEMS_RANGES[0] }))} style={chipBtnStyle}><X size={11} /></button>
                </span>
              )}
              {filters.priceRange.label !== 'Any' && (
                <span style={chipStyle}>
                  {filters.priceRange.label}
                  <button onClick={() => setFilters(f => ({ ...f, priceRange: PRICE_RANGES[0] }))} style={chipBtnStyle}><X size={11} /></button>
                </span>
              )}
              <button onClick={clearAll} style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0' }}>
                Clear all
              </button>
            </div>
          )}

          {/* ── Content ── */}
          {isLoading ? (
            <div className="text-center py-5"><div className="spinner-border text-success" role="status" /></div>
          ) : filteredOrders.length === 0 ? (
            <div className="card-farm p-5 text-center" style={{ color: 'var(--text-muted)' }}>
              {orderData?.length === 0 ? 'No orders received yet' : 'No orders match your search or filters'}
            </div>
          ) : (
            <div className="d-flex flex-column gap-4">
              {grouped.map(({ dateKey, orders: group }) => {
                const label = dateKey !== 'unknown' ? formatDateLabel(dateKey) : null;

                return (
                  <div key={dateKey}>

                    {/* ── Date header row (identical to inventory) ── */}
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
                                {group.length} {group.length === 1 ? 'order' : 'orders'}
                              </span>
                            </div>
                          </div>

                          {/* Divider */}
                          <div style={{ flex: 1, height: 1, background: 'rgba(74,124,89,0.15)' }} />
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>Date unknown</div>
                      )}
                    </div>

                    {/* ── Grid card (mirrors inventory layout) ── */}
                    <div className="card-farm" style={{ overflow: 'hidden' }}>

                      {/* Grid header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: GRID_COLS,
                        padding: '10px 20px',
                        gap: 12,
                        background: 'rgba(74,124,89,0.06)',
                        borderBottom: '1px solid rgba(74,124,89,0.12)',
                      }}>
                        {['Order No.', 'Customer', 'Items', 'Total', 'Payment', 'Status', ''].map((h, i) => (
                          <div key={i} style={{
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                            textTransform: 'uppercase', color: 'var(--primary-green)', opacity: 0.75,
                          }}>{h}</div>
                        ))}
                      </div>

                      {/* Grid rows */}
                      {group.map((order, rowIdx) => {
                        const isLast     = rowIdx === group.length - 1;
                        const statusCol  = STATUS_COLORS[order.status] || 'var(--primary-green)';
                        const tableTotal = getOrderTableTotal(order);

                        return (
                          <div
                            key={order._id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: GRID_COLS,
                              padding: '13px 20px',
                              gap: 12,
                              alignItems: 'center',
                              borderBottom: isLast ? 'none' : '1px solid rgba(74,124,89,0.07)',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,124,89,0.04)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            {/* Order number + time */}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--primary-green)', lineHeight: 1.3 }}>
                                {order.orderNumber}
                              </div>
                              {order.createdAt && (
                                <div style={{ fontSize: 11, color: '#8a9b8a', marginTop: 2, fontWeight: 500 }}>
                                  🕐 {formatOrderTime(order.createdAt)}
                                </div>
                              )}
                            </div>

                            {/* Customer name */}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)', lineHeight: 1.3 }}>
                                {order.buyer?.businessInfo?.businessName || 'Bulk Buyer'}
                              </div>
                              <div style={{ fontSize: 11, color: '#8a9b8a', marginTop: 2 }}>
                                {order.buyer?.firstName} {order.buyer?.lastName}
                              </div>
                            </div>

                            {/* Items count pill */}
                            <div>
                              <span style={{
                                display: 'inline-block', fontSize: 11, fontWeight: 600,
                                color: 'var(--primary-green)', background: 'rgba(74,124,89,0.09)',
                                borderRadius: 20, padding: '3px 10px',
                              }}>
                                {order.items?.length} {order.items?.length === 1 ? 'item' : 'items'}
                              </span>
                            </div>

                            {/* Total */}
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)' }}>
                              ₹{tableTotal.toFixed(2)}
                            </div>

                            {/* Payment method pill */}
                            <div>
                              <span style={{
                                display: 'inline-block', fontSize: 11, fontWeight: 700,
                                color: '#555', background: 'rgba(0,0,0,0.06)',
                                borderRadius: 20, padding: '3px 10px',
                                textTransform: 'uppercase', letterSpacing: '0.04em',
                              }}>
                                {order.payment?.method || '—'}
                              </span>
                            </div>

                            {/* Status badge — coloured like inventory "In Stock / Low Stock" */}
                            <div>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                fontSize: 11, fontWeight: 600,
                                color: statusCol,
                                background: statusCol + '1a',
                                borderRadius: 20, padding: '3px 10px',
                                whiteSpace: 'nowrap',
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusCol, flexShrink: 0 }} />
                                {order.status.replace(/_/g, ' ')}
                              </span>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button
                                onClick={() => { setSelectedOrder(order); setComment(''); }}
                                title="View"
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
                                <Eye size={13} />
                              </button>

                              <button
                                onClick={() => handleDownloadInvoice(order._id, order.orderNumber)}
                                disabled={downloadingInvoice === order._id}
                                title="Download invoice"
                                style={{
                                  width: 32, height: 32,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  border: '1.5px solid rgba(100,100,100,0.25)', borderRadius: 8,
                                  background: 'transparent', color: 'var(--text-dark)',
                                  cursor: downloadingInvoice === order._id ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.15s', opacity: downloadingInvoice === order._id ? 0.6 : 1,
                                }}
                                onMouseEnter={e => { if (downloadingInvoice !== order._id) { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; e.currentTarget.style.borderColor = '#888'; } }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(100,100,100,0.25)'; }}
                              >
                                {downloadingInvoice === order._id
                                  ? <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12, borderWidth: '2px' }} />
                                  : <FileDown size={13} />
                                }
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                  </div>
                );
              })}
            </div>
          )}

          {/* ── Order Detail Modal (unchanged) ── */}
          {selectedOrder && createPortal(
            <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999 }}>
              <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 card-farm shadow-lg p-4" style={{ background: 'var(--bg-card)' }}>
                  <div className="modal-header border-0 pb-0">
                    <h5 className="modal-title fw-bold text-success">Order Details — {selectedOrder.orderNumber}</h5>
                    <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)} />
                  </div>
                  <div className="modal-body pt-3">
                    <div className="row g-3 mb-4">
                      <div className="col-md-6">
                        <div className="fw-bold mb-1" style={{ color: 'var(--text-dark)' }}>Billing Address</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                          {selectedOrder.shippingAddress?.street}, {selectedOrder.shippingAddress?.city},{' '}
                          {selectedOrder.shippingAddress?.state} — {selectedOrder.shippingAddress?.postalCode}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="fw-bold mb-1" style={{ color: 'var(--text-dark)' }}>Payment Info</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                          Method: <strong>{selectedOrder.payment?.method?.toUpperCase()}</strong><br />
                          Status: <strong>{selectedOrder.payment?.status?.toUpperCase()}</strong>
                        </div>
                      </div>
                    </div>
                    <div className="row g-3 mb-4">
                      <div className="col-md-6">
                        <div className="fw-bold mb-1" style={{ color: 'var(--text-dark)' }}>Buyer Name</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                          {selectedOrder.user?.name || (selectedOrder.buyer?.firstName + ' ' + selectedOrder.buyer?.lastName) || 'N/A'}
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="fw-bold mb-1" style={{ color: 'var(--text-dark)' }}>Phone Number</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                          {selectedOrder.user?.phone || selectedOrder.buyer?.phone || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <h6 className="fw-bold text-success mb-3">Order Items</h6>
                    <div className="table-responsive mb-4">
                      <table className="table table-bordered table-sm align-middle" style={{ fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th style={{ color: 'var(--text-muted)' }}>Produce Name</th>
                            <th style={{ color: 'var(--text-muted)' }}>Quantity</th>
                            <th style={{ color: 'var(--text-muted)' }}>Unit Price</th>
                            <th style={{ color: 'var(--text-muted)' }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items?.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ color: 'var(--text-dark)' }}>{item.name}</td>
                              <td style={{ color: 'var(--text-dark)' }}>{item.quantity} {item.unit}</td>
                              <td style={{ color: 'var(--text-dark)' }}>₹{item.price}</td>
                              <td className="fw-bold" style={{ color: 'var(--text-dark)' }}>₹{item.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ background: 'var(--bg-cream)', border: '1.5px solid var(--border-color)', borderRadius: '14px', padding: '16px 18px', marginBottom: '20px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
                        Order Progress — click the next step to update
                      </div>
                      <StatusStepBar
                        currentStatus={selectedOrder.status}
                        onAdvance={handleAdvanceStatus}
                        isLoading={statusMutation.isPending}
                        isCancelled={selectedOrder.status === 'cancelled'}
                      />
                    </div>

                    {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                      <div className="mb-4">
                        <label className="form-label fw-semibold" style={{ color: 'var(--text-dark)', fontSize: '13px' }}>
                          Comment (optional — sent to buyer with status update)
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="e.g. Packed and ready for dispatch…"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          disabled={isModalBusy}
                          style={{ background: 'var(--bg-cream)', color: 'var(--text-dark)', borderColor: 'var(--border-color)', fontSize: '13px' }}
                        />
                      </div>
                    )}

                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                          <button
                            className="btn btn-outline-danger"
                            disabled={isModalBusy}
                            onClick={() => cancelMutation.mutate({ id: selectedOrder._id, reason: comment || 'Cancelled by supplier' })}
                          >
                            {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Order'}
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Current status:{' '}
                        <span style={{ fontWeight: 700, color: STATUS_COLORS[selectedOrder.status] || 'var(--text-dark)' }}>
                          {selectedOrder.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}

        </div>
      </div>
    </div>
  );
};

export default SupplierOrders;
