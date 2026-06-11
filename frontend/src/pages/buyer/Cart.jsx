import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCart, updateItemQuantity, removeItemFromCart, clearUserCart } from '../../store/slices/cartSlice.js';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api.js';
import {
  Trash2, ShoppingCart, ArrowRight, MapPin, CreditCard,
  LocateFixed, CheckCircle2, PencilLine, X, Loader2,
  ChevronDown, ChevronUp, Home, Building2,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';
// import Sidebar from '../../components/layout/Sidebar.jsx';

/* ─────────────────────────────────────────────────────────────
   Reverse-geocode lat/lng → precise address via Nominatim
   zoom=18 = building level (most precise Nominatim supports)
───────────────────────────────────────────────────────────── */
const reverseGeocode = async (lat, lng) => {
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`;

  const res  = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();
  const a    = data.address || {};

  // Most precise: house number + road name + building/office name
  const streetParts = [
    a.house_number,
    a.road || a.pedestrian || a.footway || a.path,
    a.building || a.office || a.amenity,
  ].filter(Boolean);

  const street =
    streetParts.length > 0
      ? streetParts.join(', ')
      : [a.neighbourhood, a.suburb, a.quarter].filter(Boolean).join(', ') || '';

  const city = a.city || a.city_district || a.town || a.village || a.county || '';

  return {
    street,
    city,
    state:      a.state || '',
    postalCode: a.postcode || '',
    fullLabel:  data.display_name || '',
  };
};

/* ─────────────────────────────────────────────────────────────
   Location Block component
───────────────────────────────────────────────────────────── */
const LocationBlock = ({ street, city, state, postalCode, onChange, onSave, saving }) => {
  const [geoStatus, setGeoStatus]   = useState('idle');   // idle | loading | success | error | denied
  const [editMode, setEditMode]     = useState(false);
  const [collapsed, setCollapsed]   = useState(false);
  const [geoError, setGeoError]     = useState('');

  const hasAddress = street || city || state || postalCode;

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoStatus('loading');
    setGeoError('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const addr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          onChange({ street: addr.street, city: addr.city, state: addr.state, postalCode: addr.postalCode });
          setGeoStatus('success');
          setEditMode(false);
          // Auto-save detected address to backend
          await onSave({ street: addr.street, city: addr.city, state: addr.state, postalCode: addr.postalCode });
        } catch {
          setGeoStatus('error');
          setGeoError('Could not fetch address details. Please fill in manually.');
        }
      },
      (err) => {
        setGeoStatus(err.code === 1 ? 'denied' : 'error');
        setGeoError(
          err.code === 1
            ? 'Location access was denied. Please allow location or fill in manually.'
            : 'Unable to detect location. Please try again or fill in manually.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [onChange, onSave]);

  const handleManualSave = async () => {
    await onSave({ street, city, state, postalCode });
    setEditMode(false);
  };

  return (
    <div className="location-block card-farm mb-4">
      {/* Header */}
      <div
        className="location-block-header"
        onClick={() => setCollapsed((v) => !v)}
        role="button"
        aria-expanded={!collapsed}
      >
        <div className="d-flex align-items-center gap-2">
          <div className="loc-icon-wrap">
            <MapPin size={18} />
          </div>
          <div>
            <div className="fw-bold" style={{ fontSize: '15px' }}>Delivery Address</div>
            {hasAddress && !editMode && (
              <div className="text-muted" style={{ fontSize: '12px', lineHeight: 1.3 }}>
                {[street, city, state, postalCode].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2">
          {hasAddress && (
            <span className="loc-saved-badge">
              <CheckCircle2 size={13} /> Saved
            </span>
          )}
          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="location-block-body">

          {/* ── Detect button row ── */}
          <div className="loc-detect-row">
            <button
              type="button"
              className={`btn-detect-location ${geoStatus === 'loading' ? 'loading' : ''}`}
              onClick={detectLocation}
              disabled={geoStatus === 'loading'}
            >
              {geoStatus === 'loading' ? (
                <Loader2 size={17} className="spin" />
              ) : (
                <LocateFixed size={17} />
              )}
              {geoStatus === 'loading' ? 'Detecting…' : 'Use my current location'}
            </button>

            {hasAddress && !editMode && (
              <button
                type="button"
                className="btn-edit-address"
                onClick={() => setEditMode(true)}
              >
                <PencilLine size={15} />
                Edit
              </button>
            )}
          </div>

          {/* ── Status messages ── */}
          {(geoStatus === 'error' || geoStatus === 'denied') && (
            <div className="loc-alert loc-alert--error">
              <X size={14} />
              {geoError}
            </div>
          )}
          {geoStatus === 'success' && (
            <div className="loc-alert loc-alert--success">
              <CheckCircle2 size={14} />
              Location detected and address saved automatically.
            </div>
          )}

          {/* ── Address display / edit ── */}
          {hasAddress && !editMode ? (
            <div className="loc-address-card">
              <Home size={16} className="loc-address-icon" />
              <div className="loc-address-text">
                <div className="fw-semibold" style={{ fontSize: '14px' }}>{street}</div>
                <div className="text-muted" style={{ fontSize: '13px' }}>
                  {[city, state, postalCode].filter(Boolean).join(', ')}
                </div>
              </div>
            </div>
          ) : (editMode || (!hasAddress && geoStatus !== 'loading')) && (
            <div className="loc-form mt-3">
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>Street Address</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="123 Main Street, Sector 4"
                  value={street}
                  onChange={(e) => onChange({ street: e.target.value, city, state, postalCode })}
                />
              </div>
              <div className="row g-3 mb-3">
                <div className="col-sm-4">
                  <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>City</label>
                  <input type="text" className="form-control" placeholder="Mumbai" value={city}
                    onChange={(e) => onChange({ street, city: e.target.value, state, postalCode })} />
                </div>
                <div className="col-sm-4">
                  <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>State</label>
                  <input type="text" className="form-control" placeholder="Maharashtra" value={state}
                    onChange={(e) => onChange({ street, city, state: e.target.value, postalCode })} />
                </div>
                <div className="col-sm-4">
                  <label className="form-label fw-semibold" style={{ fontSize: '13px' }}>Postal Code</label>
                  <input type="text" className="form-control" placeholder="400001" value={postalCode}
                    onChange={(e) => onChange({ street, city, state, postalCode: e.target.value })} />
                </div>
              </div>
              <div className="d-flex gap-2">
                <button
                  type="button"
                  className="btn-save-address"
                  onClick={handleManualSave}
                  disabled={saving || !street || !city || !state || !postalCode}
                >
                  {saving ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />}
                  {saving ? 'Saving…' : 'Save Address'}
                </button>
                {editMode && (
                  <button type="button" className="btn-cancel-edit" onClick={() => setEditMode(false)}>
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Main BuyerCart
───────────────────────────────────────────────────────────── */
const BuyerCart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { cart, loading } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);

  const [street, setStreet]             = useState('');
  const [city, setCity]                 = useState('');
  const [addrState, setAddrState]       = useState('');
  const [postalCode, setPostalCode]     = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [addrSaving, setAddrSaving]     = useState(false);
  const [addrSaved, setAddrSaved]       = useState(false);

  // Prefill from saved profile addresses
  useEffect(() => {
    dispatch(fetchCart());
    const primary = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];
    if (primary) {
      setStreet(primary.street || '');
      setCity(primary.city || '');
      setAddrState(primary.state || '');
      setPostalCode(primary.postalCode || '');
      setAddrSaved(true);
    }
  }, [dispatch, user]);

  /* Save / update address on backend */
  const handleSaveAddress = useCallback(async (addr) => {
    setAddrSaving(true);
    try {
      // Upsert default address on user profile
      await api.put('/users/address/default', {
        street:     addr.street,
        city:       addr.city,
        state:      addr.state,
        postalCode: addr.postalCode,
        isDefault:  true,
      });
      setAddrSaved(true);
    } catch (err) {
      console.error('Address save failed:', err);
    } finally {
      setAddrSaving(false);
    }
  }, []);

  const handleAddressChange = ({ street: s, city: c, state: st, postalCode: p }) => {
    setStreet(s); setCity(c); setAddrState(st); setPostalCode(p);
  };

  /* Quantity / cart handlers */
  const handleQtyChange = (itemId, quantity) => {
    if (quantity < 1) return;
    dispatch(updateItemQuantity({ itemId, quantity }));
  };
  const handleRemove = (itemId) => dispatch(removeItemFromCart(itemId));
  const handleClear  = () => dispatch(clearUserCart());

  /* Razorpay loader */
  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });

  /* Checkout */
  const handleCheckout = async (e) => {
    e.preventDefault();
    setCheckoutLoading(true);
    const shippingAddress = { street, city, state: addrState, postalCode };

    try {
      const response = await api.post('/orders', { shippingAddress, paymentMethod });
      if (response.data.success) {
        const { order, razorpay } = response.data.data;

        if (paymentMethod === 'online' && razorpay) {
          const loaded = await loadRazorpayScript();
          if (!loaded) { alert('Razorpay SDK failed to load.'); setCheckoutLoading(false); return; }

          const options = {
            key: razorpay.keyId,
            amount: razorpay.amount,
            currency: razorpay.currency,
            name: 'FarmFlow B2B',
            description: `Order ${order.orderNumber}`,
            order_id: razorpay.razorpayOrderId,
            handler: async (res) => {
              try {
                const v = await api.post('/payments/verify', {
                  razorpayOrderId:   res.razorpay_order_id,
                  razorpayPaymentId: res.razorpay_payment_id,
                  razorpaySignature: res.razorpay_signature,
                });
                if (v.data.success) { alert('Payment verified!'); navigate('/orders'); }
              } catch { alert('Payment verification failed.'); }
            },
            prefill: { name: user.fullName, email: user.email, contact: user.phone || '' },
            theme: { color: '#2e7d32' },
          };
          new window.Razorpay(options).open();
        } else {
          alert('Order placed successfully (Cash on Delivery)!');
          navigate('/orders');
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };

  /* Pricing */
  const items = cart?.items || [];
  const subtotal           = items.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0);
  const discountedSubtotal = items.reduce((s, i) => s + (i.product?.effectivePrice || i.product?.price || 0) * i.quantity, 0);
  const discount           = subtotal - discountedSubtotal;
  const deliveryFee        = 0;
  // const deliveryFee        = discountedSubtotal > 5000 || discountedSubtotal === 0 ? 0 : 250;
  const tax                = 0;
  const total              = discountedSubtotal + deliveryFee + tax;

  return (
    <div className="app-container">
      {/* <Sidebar /> */}
      <div className="main-content">
        <Navbar />

        <div className="container-fluid p-0 animate-fade-in">
          <h2 className="fw-bold mb-4">Your Shopping Cart</h2>

          {loading && !cart ? (
            <div className="text-center py-5">
              <div className="spinner-border text-success" role="status" />
            </div>
          ) : items.length === 0 ? (
            <div className="card-farm text-center py-5">
              <h4>Your cart is empty</h4>
              <p className="text-muted">Browse the marketplace to add fresh produce to your cart.</p>
              <button className="btn btn-primary-farm mt-3" onClick={() => navigate('/marketplace')}>
                Go to Marketplace
              </button>
            </div>
          ) : (
            <div className="row g-4">

              {/* ── Left column ── */}
              <div className="col-lg-7">

                {/* Cart items */}
                <div className="card-farm p-3 mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold text-success mb-0">Produce List</h5>
                    <button className="btn btn-outline-danger btn-sm" onClick={handleClear}>
                      Clear Cart
                    </button>
                  </div>
                  {items.map((item) => (
                    <div key={item._id} className="d-flex align-items-center gap-3 py-3 border-bottom">
                      <img
                        src={item.product?.images?.[0]?.url || 'https://via.placeholder.com/80?text=No+Image'}
                        alt={item.product?.name}
                        className="rounded-3"
                        width="70"
                        height="70"
                        style={{ objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div className="flex-grow-1 min-width-0">
                        <div className="fw-bold">{item.product?.name}</div>
                        <div className="text-muted small">
                          ₹{item.product?.effectivePrice || item.product?.price} / {item.product?.unit}
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-2 flex-shrink-0">
                        <button className="btn btn-light btn-sm" onClick={() => handleQtyChange(item._id, item.quantity - 1)}>−</button>
                        <span className="fw-bold px-2">{item.quantity}</span>
                        <button className="btn btn-light btn-sm" onClick={() => handleQtyChange(item._id, item.quantity + 1)}>+</button>
                      </div>
                      <button className="btn btn-outline-danger btn-sm border-0 flex-shrink-0" onClick={() => handleRemove(item._id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* ── Location block (new) ── */}
                <LocationBlock
                  street={street}
                  city={city}
                  state={addrState}
                  postalCode={postalCode}
                  onChange={handleAddressChange}
                  onSave={handleSaveAddress}
                  saving={addrSaving}
                />

                {/* ── Checkout form ── */}
                <form onSubmit={handleCheckout} className="card-farm p-4">
                  <h5 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                    <MapPin size={20} /> Shipping & Delivery Destination
                  </h5>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Street Address</label>
                    <input type="text" className="form-control" placeholder="123 Main St"
                      value={street} onChange={(e) => setStreet(e.target.value)} required />
                  </div>
                  <div className="row g-3 mb-4">
                    <div className="col-sm-4">
                      <label className="form-label fw-semibold">City</label>
                      <input type="text" className="form-control" placeholder="Mumbai"
                        value={city} onChange={(e) => setCity(e.target.value)} required />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label fw-semibold">State</label>
                      <input type="text" className="form-control" placeholder="Maharashtra"
                        value={addrState} onChange={(e) => setAddrState(e.target.value)} required />
                    </div>
                    <div className="col-sm-4">
                      <label className="form-label fw-semibold">Postal Code</label>
                      <input type="text" className="form-control" placeholder="400001"
                        value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
                    </div>
                  </div>

                  {/* Payment */}
                  <h5 className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                    <CreditCard size={20} /> Select Payment Method
                  </h5>
                  <div className="payment-options mb-4">
                    {[
                      { value: 'cod',    label: 'Pay After Delivery (COD)' },
                      { value: 'online', label: 'Pay Online (Razorpay)' },
                    ].map((opt) => (
                      <label
                        key={opt.value}
                        className={`payment-option-card ${paymentMethod === opt.value ? 'selected' : ''}`}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={opt.value}
                          checked={paymentMethod === opt.value}
                          onChange={() => setPaymentMethod(opt.value)}
                          className="visually-hidden"
                        />
                        <span className="payment-radio-dot" />
                        {opt.label}
                      </label>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary-farm w-100 py-3 d-flex align-items-center justify-content-center gap-2"
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? (
                      <span className="spinner-border spinner-border-sm" role="status" />
                    ) : (
                      <> Complete Purchase <ArrowRight size={18} /> </>
                    )}
                  </button>
                </form>
              </div>

              {/* ── Order summary ── */}
              <div className="col-lg-5">
                <div className="card-farm p-4 sticky-top" style={{ top: '85px' }}>
                  <h5 className="fw-bold text-success mb-3">Order Price Summary</h5>
                  {[
                    { label: 'Subtotal',       val: `₹${subtotal.toFixed(2)}` },
                    { label: 'Discount',       val: `-₹${discount.toFixed(2)}`, color: '#2e7d32' },
                    { label: 'Delivery Fee',   val: deliveryFee === 0 ? 'Free' : `₹${deliveryFee.toFixed(2)}`, color: deliveryFee === 0 ? '#2e7d32' : undefined },
                    
                    { label: 'GST / Tax (5%)', val: `₹${tax.toFixed(2)}` },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="d-flex justify-content-between mb-2">
                      <span className="text-muted">{label}</span>
                      <span style={color ? { color } : {}}>{val}</span>
                    </div>
                  ))}
                  <hr />
                  <div className="d-flex justify-content-between mb-4">
                    <span className="fw-bold fs-5">Total Cost</span>
                    <span className="fw-bold text-success fs-5">₹{total.toFixed(2)}</span>
                  </div>
                  <div className="bg-success-subtle p-3 rounded-3 text-success text-center small">
                    🌱 Orders above ₹5,000 qualify for free delivery!
                  </div>
                  {addrSaved && (
                    <div className="mt-3 d-flex align-items-center gap-2 text-success" style={{ fontSize: '13px' }}>
                      <CheckCircle2 size={15} />
                      Delivery address saved to your profile.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BuyerCart;
