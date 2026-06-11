import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/api.js';
import { FileSpreadsheet, UserCheck } from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';

// Grid columns: Client | Business | Revenue | Orders | AOV | Segment
const GRID_COLS = '1fr 1fr 140px 120px 130px 120px';

const SEGMENT_COLORS = {
  VIP:      { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  Regular:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  New:      { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  Inactive: { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
};

const SupplierReports = () => {
  const { data: customerData, isLoading: customersLoading } = useQuery({
    queryKey: ['customerSpending'],
    queryFn: async () => {
      const response = await api.get('/analytics/customers');
      return response.data.data.customerSpending;
    },
  });

  return (
    <div className="app-container">
      <div className="main-content">
        <Navbar />

        <div className="container-fluid p-0 animate-fade-in">

          {/* ── Page header ── */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold mb-0">Business Intelligence Reports</h2>
            <button className="btn btn-outline-success btn-sm d-flex align-items-center gap-1">
              <FileSpreadsheet size={16} /> Export to Excel
            </button>
          </div>

          {/* ── Customer Spending Card ── */}
          <div className="card-farm" style={{ overflow: 'hidden' }}>

            {/* Card header */}
            <div style={{ padding: '20px 20px 14px' }}>
              <div className="d-flex align-items-center gap-2 mb-1">
                <UserCheck size={20} color="var(--primary-green)" />
                <h5 className="fw-bold mb-0" style={{ color: 'var(--text-dark)' }}>
                  Customer Spending &amp; Loyalty Profiling
                </h5>
              </div>
              <p className="text-muted mb-0" style={{ fontSize: 13 }}>
                Analyze bulk purchase habits, average order values, and client segments.
              </p>
            </div>

            {/* Thin accent divider */}
            <div style={{ height: 1, background: 'rgba(74,124,89,0.12)', margin: '0 0 0 0' }} />

            {customersLoading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success" role="status" />
              </div>
            ) : !customerData?.length ? (
              <div className="text-center text-muted py-5">No client purchase history found</div>
            ) : (
              <>
                {/* Grid header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: GRID_COLS,
                  padding: '10px 20px',
                  gap: 12,
                  background: 'rgba(74,124,89,0.06)',
                  borderBottom: '1px solid rgba(74,124,89,0.12)',
                }}>
                  {['Client Name', 'Business Name', 'Total Revenue', 'Orders', 'Avg. Order Value', 'Segment'].map((h, i) => (
                    <div key={i} style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase', color: 'var(--primary-green)', opacity: 0.75,
                    }}>{h}</div>
                  ))}
                </div>

                {/* Grid rows */}
                {customerData.map((item, idx) => {
                  const isLast = idx === customerData.length - 1;
                  const seg    = SEGMENT_COLORS[item.segment] || SEGMENT_COLORS['Inactive'];

                  return (
                    <div
                      key={idx}
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
                      {/* Client name */}
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)', lineHeight: 1.3 }}>
                        {item.name}
                      </div>

                      {/* Business name */}
                      <div style={{ fontSize: 13, color: '#8a9b8a', fontWeight: 500 }}>
                        {item.businessName || '—'}
                      </div>

                      {/* Total revenue */}
                      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--primary-green)' }}>
                        ₹{item.totalSpent}
                      </div>

                      {/* Orders count pill */}
                      <div>
                        <span style={{
                          display: 'inline-block', fontSize: 11, fontWeight: 600,
                          color: 'var(--primary-green)', background: 'rgba(74,124,89,0.09)',
                          borderRadius: 20, padding: '3px 10px',
                        }}>
                          {item.orderCount} {item.orderCount === 1 ? 'order' : 'orders'}
                        </span>
                      </div>

                      {/* AOV */}
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>
                        ₹{item.averageOrderValue}
                      </div>

                      {/* Segment badge */}
                      <div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          fontSize: 11, fontWeight: 600,
                          color: seg.color, background: seg.bg,
                          borderRadius: 20, padding: '3px 10px',
                          whiteSpace: 'nowrap',
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                          {item.segment}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default SupplierReports;
