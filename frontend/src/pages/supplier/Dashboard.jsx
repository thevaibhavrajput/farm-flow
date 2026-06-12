import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/api.js';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { 
  ShoppingBag, 
  DollarSign, 
  Users, 
  AlertTriangle, 
  Activity, 
  Sparkles 
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';
// import Sidebar from '../../components/layout/Sidebar.jsx';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const SupplierDashboard = () => {
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['supplierDashboard'],
    queryFn: async () => {
      const response = await api.get('/analytics/supplier');
      return response.data.data;
    },
  });

  const cards = dashboardData?.stats?.cards || {};
  const topProducts = dashboardData?.stats?.topProducts || [];
  const monthlySales = dashboardData?.stats?.monthlySales || [];
  const predictions = dashboardData?.aiPredictions || [];
  const suggestions = dashboardData?.aiSuggestions || [];

  // Chart data configuration
  const lineChartData = {
    labels: monthlySales.map((item) => item.label),
    datasets: [
      {
        label: 'Monthly Revenue (₹)',
        data: monthlySales.map((item) => item.revenue),
        borderColor: '#2e7d32',
        backgroundColor: 'rgba(46, 125, 50, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const barChartData = {
    labels: topProducts.map((item) => item.name),
    datasets: [
      {
        label: 'Quantity Sold',
        data: topProducts.map((item) => item.totalQuantity),
        backgroundColor: '#4caf50',
      },
    ],
  };

  return (
    <div className="app-container">
      {/* <Sidebar /> */}
      <div className="main-content">
        <Navbar />
        
        <div className="container-fluid p-0 animate-fade-in">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="fw-bold mb-0">Supplier Dashboard</h2>
            <button className="btn btn-outline-success btn-sm" onClick={() => refetch()}>
              Refresh Stats
            </button>
          </div>

          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status"></div>
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="row g-3 mb-4">
                <div className="col-md-3">
                  <div className="card-farm p-3 d-flex align-items-center gap-3">
                    <div className="bg-success-subtle text-success p-3 rounded-circle">
                      <ShoppingBag size={24} />
                    </div>
                    <div>
                      <div className="text-muted small">Total Products</div>
                      <h4 className="fw-bold mb-0">{cards.totalProducts}</h4>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card-farm p-3 d-flex align-items-center gap-3">
                    <div className="bg-primary-subtle text-primary p-3 rounded-circle">
                      <DollarSign size={24} />
                    </div>
                    <div>
                      <div className="text-muted small">Total Sales</div>
                      <h4 className="fw-bold mb-0">₹{cards.totalRevenue}</h4>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card-farm p-3 d-flex align-items-center gap-3">
                    <div className="bg-info-subtle text-info p-3 rounded-circle">
                      <Users size={24} />
                    </div>
                    <div>
                      <div className="text-muted small">Active Customers</div>
                      <h4 className="fw-bold mb-0">{cards.totalCustomers}</h4>
                    </div>
                  </div>
                </div>

                <div className="col-md-3">
                  <div className="card-farm p-3 d-flex align-items-center gap-3">
                    <div className="bg-danger-subtle text-danger p-3 rounded-circle">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <div className="text-muted small">Low Stock Alert</div>
                      <h4 className="fw-bold mb-0 text-danger">{cards.lowStockProducts}</h4>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Assistant Section */}
              <div className="card border-0 bg-success-subtle p-3 rounded-4 mb-4">
                <h5 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                  <Sparkles size={20} /> AI Smart Suggestions & Low Stock Warnings
                </h5>
                
<div className="d-flex flex-column gap-2">
  {suggestions.length === 0 ? (
    <div style={{ fontSize: 13, color: '#8a9b8a' }}>
      All stock levels look great! No suggestions.
    </div>
  ) : (
    suggestions.slice(0, 3).map((s, i) => (
      <div key={i} style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        borderRadius: 10,
        background: s.bgColor,
        border: `1px solid ${s.borderColor}`,
      }}>
        {/* Dot */}
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: s.dotColor, flexShrink: 0,
        }} />

        {/* Badge */}
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: s.labelColor,
          background: s.labelBg,
          borderRadius: 20, padding: '2px 9px',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          {s.badge}
        </span>

        {/* Product name */}
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)', flexShrink: 0 }}>
          {s.productName}
        </span>

        {/* Separator */}
        <span style={{ color: 'rgba(74,124,89,0.35)', fontSize: 12, flexShrink: 0 }}>·</span>

        {/* Message */}
        <span style={{ fontSize: 13, color: '#8a9b8a', fontWeight: 400 }}>
          {s.message}
        </span>
      </div>
    ))
  )}
</div>
              </div>

              {/* Charts Section */}
              <div className="row g-4 mb-4">
                <div className="col-lg-7">
                  <div className="card-farm p-3">
                    <h5 className="fw-bold text-success mb-3">Revenue Trend</h5>
                    <Line data={lineChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                  </div>
                </div>
                <div className="col-lg-5">
                  <div className="card-farm p-3">
                    <h5 className="fw-bold text-success mb-3">Top Selling Products</h5>
                    <Bar data={barChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                  </div>
                </div>
              </div>

              {/* AI Demand Prediction Table */}
             <div className="card-farm" style={{ overflow: 'hidden' }}>
  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(74,124,89,0.12)' }}>
    <h5 className="fw-bold mb-0 d-flex align-items-center gap-2" style={{ color: 'var(--primary-green)' }}>
      <Activity size={20} /> AI-Based Weekly Demand Prediction & Inventory Plan
    </h5>
  </div>

  {/* Table Header */}
  <div style={{
    display: 'grid',
    gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr',
    padding: '10px 20px',
    gap: 12,
    background: 'rgba(74,124,89,0.06)',
    borderBottom: '1px solid rgba(74,124,89,0.12)',
  }}>
    {['Product Name', 'Current Stock', 'Weekly Sales Avg', 'AI Predicted Next Week', 'Recommendation'].map((h, i) => (
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
  {predictions.length === 0 ? (
    <div style={{ padding: '32px 20px', textAlign: 'center', color: '#8a9b8a', fontSize: 14 }}>
      No sales prediction data available yet
    </div>
  ) : (
    predictions.map((p, idx) => {
      const isLast = idx === predictions.length - 1;

      const rec = p.recommendation === 'REORDER_NOW'
        ? { label: 'Reorder Now', color: '#dc3545', bg: 'rgba(220,53,69,0.1)', dot: '#dc3545' }
        : p.recommendation === 'MONITOR'
        ? { label: 'Monitor',     color: '#a06000', bg: 'rgba(160,96,0,0.1)',  dot: '#e07b39' }
        : { label: 'Sufficient',  color: '#2d7a47', bg: 'rgba(45,122,71,0.1)', dot: '#2d7a47' };

      return (
        <div
          key={p.productId}
          style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr',
            padding: '13px 20px',
            gap: 12,
            alignItems: 'center',
            borderBottom: isLast ? 'none' : '1px solid rgba(74,124,89,0.07)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,124,89,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {/* Product Name */}
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-dark)' }}>
            {p.name}
          </div>

          {/* Current Stock */}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dark)' }}>
            {p.currentStock}
            <span style={{ fontSize: 11, fontWeight: 400, color: '#8a9b8a', marginLeft: 4 }}>{p.unit}</span>
          </div>

          {/* Weekly Sales Avg */}
          <div style={{ fontSize: 13, color: '#8a9b8a', fontWeight: 500 }}>
            {p.averageWeeklySales}
            <span style={{ fontSize: 11, marginLeft: 4 }}>{p.unit}</span>
          </div>

          {/* AI Predicted */}
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary-green)' }}>
            {p.predictedNextWeekDemand}
            <span style={{ fontSize: 11, fontWeight: 400, color: '#8a9b8a', marginLeft: 4 }}>{p.unit}</span>
          </div>

          {/* Recommendation pill */}
          <div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 600,
              color: rec.color,
              background: rec.bg,
              borderRadius: 20, padding: '3px 10px',
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: rec.dot, flexShrink: 0 }} />
              {rec.label}
            </span>
          </div>
        </div>
      );
    })
  )}
</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierDashboard;
