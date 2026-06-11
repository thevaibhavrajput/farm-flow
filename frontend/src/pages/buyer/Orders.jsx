import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api/api.js';
import { Eye, FileDown, XCircle, RefreshCw } from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';
import { useToast } from '../../components/layout/Toast.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────

const getDateKey = (dateStr) => new Date(dateStr).toISOString().split('T')[0];

const formatDateLabel = (dateStr) => {
  const d = new Date(dateStr);
  return {
    weekday: d.toLocaleString('default', { weekday: 'long' }),
    day:     d.getDate(),
    month:   d.toLocaleString('default', { month: 'long' }),
    year:    d.getFullYear(),
  };
};

const formatOrderTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const groupOrdersByDate = (orders) => {
  if (!orders?.length) return [];
  const map = {}, keys = [];
  orders.forEach((o) => {
    const key = o.createdAt ? getDateKey(o.createdAt) : 'unknown';
    if (!map[key]) { map[key] = []; keys.push(key); }
    map[key].push(o);
  });
  keys.sort((a, b) => (a === 'unknown' ? 1 : b === 'unknown' ? -1 : b.localeCompare(a)));
  return keys.map((key) => ({ dateKey: key, orders: map[key] }));
};

const STATUS_COLORS = {
  pending:          '#f59e0b',
  confirmed:        '#3b82f6',
  processing:       '#8b5cf6',
  packed:           '#06b6d4',
  out_for_delivery: '#f97316',
  delivered:        '#22c55e',
  cancelled:        '#ef4444',
};

// Grid columns: Order No. | Supplier | Items | Total | Status | Actions
const GRID_COLS = '160px 1fr 110px 120px 160px 90px';

// ── Main Component ────────────────────────────────────────────────────────────

const BuyerOrders = () => {
  const queryClient = useQueryClient();
  const showToast   = useToast();
  const [downloadingInvoice, setDownloadingInvoice] = useState(null);
  const [selectedOrder, setSelectedOrder]           = useState(null);

  const { data: orderData, isLoading, refetch } = useQuery({
    queryKey: ['buyerOrders'],
    queryFn: async () => {
      const response = await api.get('/orders');
      return response.data.data.orders;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }) => api.post(`/orders/${id}/cancel`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['buyerOrders']);
      setSelectedOrder(null);
    },
  });

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
      showToast({ title: 'Invoice Downloaded', sub: `Invoice #${orderNumber} downloaded successfully`, variant: 'success', duration: 3000 });
    } catch (error) {
      showToast({ title: 'Download Failed', sub: error.response?.data?.message || 'Failed to download invoice', variant: 'error', duration: 3000 });
    } finally {
      setDownloadingInvoice(null);
    }
  };

  const grouped = groupOrdersByDate(orderData || []);

  return (
    <div className="app-container">
      <div className="main-content">
        <Navbar />

        <div className="container-fluid p-0 animate-fade-in">

          {/* ── Page header ── */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold mb-0">My Order History</h2>
            <button
              className="btn btn-outline-success btn-sm d-flex align-items-center gap-1"
              onClick={() => refetch()}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          {/* ── Content ── */}
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status" />
            </div>
          ) : !orderData?.length ? (
            <div className="card-farm p-5 text-center text-muted">No orders placed yet</div>
          ) : (
            <div className="d-flex flex-column gap-4">
              {grouped.map(({ dateKey, orders: group }) => {
                const label = dateKey !== 'unknown' ? formatDateLabel(dateKey) : null;

                return (
                  <div key={dateKey}>

                    {/* ── Date header row ── */}
                    <div className="d-flex align-items-center gap-3 mb-3">
                      {label ? (
                        <>
                          <div
                            className="d-flex flex-column align-items-center justify-content-center"
                            style={{ width: 52, height: 52, background: 'var(--primary-green)', borderRadius: 12, flexShrink: 0 }}
                          >
                            <span style={{ fontSize: 20, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{label.day}</span>
                            <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {label.month.slice(0, 3)}
                            </span>
                          </div>
                          <div style={{ lineHeight: 1.35 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-dark)' }}>{label.weekday}</div>
                            <div style={{ fontSize: 12, color: '#8a9b8a', fontWeight: 500 }}>
                              {label.day} {label.month} {label.year}
                              <span className="ms-2 px-2" style={{ background: 'rgba(74,124,89,0.1)', color: 'var(--primary-green)', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
                                {group.length} {group.length === 1 ? 'order' : 'orders'}
                              </span>
                            </div>
                          </div>
                          <div style={{ flex: 1, height: 1, background: 'rgba(74,124,89,0.15)' }} />
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: '#aaa', fontStyle: 'italic' }}>Date unknown</div>
                      )}
                    </div>

                    {/* ── Grid card ── */}
                    <div className="card-farm" style={{ overflow: 'hidden' }}>

                      {/* Header */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: GRID_COLS,
                        padding: '10px 20px',
                        gap: 12,
                        background: 'rgba(74,124,89,0.06)',
                        borderBottom: '1px solid rgba(74,124,89,0.12)',
                      }}>
                        {['Order No.', 'Supplier', 'Items', 'Total', 'Status', ''].map((h, i) => (
                          <div key={i} style={{
                            fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                            textTransform: 'uppercase', color: 'var(--primary-green)', opacity: 0.75,
                          }}>{h}</div>
                        ))}
                      </div>

                      {/* Rows */}
                      {group.map((order, rowIdx) => {
                        const isLast    = rowIdx === group.length - 1;
                        const statusCol = STATUS_COLORS[order.status] || 'var(--primary-green)';

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

                            {/* Supplier name */}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)', lineHeight: 1.3 }}>
                                {order.supplier?.businessInfo?.businessName || order.supplier?.firstName
                                  ? `${order.supplier?.firstName || ''} ${order.supplier?.lastName || ''}`.trim()
                                  : 'Supplier'}
                              </div>
                              {order.supplier?.email && (
                                <div style={{ fontSize: 11, color: '#8a9b8a', marginTop: 2 }}>
                                  {order.supplier.email}
                                </div>
                              )}
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
                              ₹{order.pricing?.total}
                            </div>

                            {/* Status badge */}
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
                                onClick={() => setSelectedOrder(order)}
                                title="Details & Track"
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

          {/* ── Details & Tracking Modal (unchanged) ── */}
          {selectedOrder && createPortal(
            <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
              <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 card-farm shadow-lg p-4">
                  <div className="modal-header border-0 pb-0">
                    <h5 className="modal-title fw-bold text-success">
                      Track Order: {selectedOrder.orderNumber}
                    </h5>
                    <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)} />
                  </div>
                  <div className="modal-body pt-3">

                    <h6 className="fw-bold text-success mb-3">Delivery Progress Timeline</h6>
                    <div className="mb-4">
                      {selectedOrder.deliveryTimeline?.length === 0 ? (
                        <div className="text-muted small">Timeline details will appear here as the order progresses.</div>
                      ) : (
                        selectedOrder.deliveryTimeline?.map((t, idx) => (
                          <div key={idx} className="d-flex gap-3 mb-3">
                            <div className="d-flex flex-column align-items-center">
                              <div className="bg-success text-white rounded-circle" style={{ width: 12, height: 12 }} />
                              {idx < selectedOrder.deliveryTimeline.length - 1 && (
                                <div className="bg-success" style={{ width: 2, flex: 1, minHeight: 20 }} />
                              )}
                            </div>
                            <div>
                              <div className="fw-bold text-capitalize" style={{ fontSize: 14 }}>
                                {t.status.replace('_', ' ')}
                              </div>
                              <div className="text-muted small">{t.description}</div>
                              <div className="text-muted small" style={{ fontSize: 11 }}>
                                {new Date(t.date).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <h6 className="fw-bold text-success mb-3">Items Summary</h6>
                    <div className="table-responsive mb-4">
                      <table className="table table-bordered table-sm align-middle" style={{ fontSize: 13 }}>
                        <thead>
                          <tr>
                            <th>Produce Name</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.items?.map((item, idx) => (
                            <tr key={idx}>
                              <td>{item.name}</td>
                              <td>{item.quantity} {item.unit}</td>
                              <td>₹{item.price}</td>
                              <td className="fw-bold">₹{item.total}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                          <button
                            className="btn btn-outline-danger d-flex align-items-center gap-1"
                            onClick={() => cancelMutation.mutate({ id: selectedOrder._id, reason: 'Buyer requested cancellation' })}
                          >
                            <XCircle size={16} /> Cancel Order
                          </button>
                        )}
                      </div>
                      <button className="btn btn-light" onClick={() => setSelectedOrder(null)}>
                        Close
                      </button>
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

export default BuyerOrders;
