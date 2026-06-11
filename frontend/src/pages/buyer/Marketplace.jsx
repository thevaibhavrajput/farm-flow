import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { addItemToCart } from '../../store/slices/cartSlice.js';
import api from '../../api/api.js';
import { Search, ShoppingCart, Sparkles, ChevronRight, Leaf, Apple, Salad, SlidersHorizontal, TrendingUp,ChevronLeft } from 'lucide-react';
import Navbar from '../../components/layout/Navbar.jsx';
import Sidebar from '../../components/layout/Sidebar.jsx';
import { useToast } from '../../components/layout/Toast.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useNavigate } from 'react-router-dom';


/* ─── Theme token factory ───────────────────────────────────────────────
   Returns two token objects — one for dark, one for light — keyed by
   the same property names so every component just reads t.bg, t.card, etc.
   ─────────────────────────────────────────────────────────────────────── */
const getTokens = (isDark) => isDark
  ? {
      /* surfaces */
      pageBg:        '#0a0f0d',
      surfaceBg:     '#111a14',
      cardBg:        'linear-gradient(145deg,#172112 0%,#111a14 100%)',
      heroBg:        'linear-gradient(135deg,#071a0f 0%,#0a2015 50%,#0d2818 100%)',
      /* borders */
      borderDefault: 'rgba(255,255,255,0.07)',
      borderHover:   'rgba(74,222,128,0.20)',
      borderHero:    'rgba(74,222,128,0.10)',
      /* text */
      textPrimary:   '#ecfdf5',
      textMuted:     '#a3b8a8',
      textDisabled:  '#4d6655',
      textPrice:     '#4ade80',
      textStrike:    '#2d4a38',
      /* accent */
      accent:        '#4ade80',
      accentBtn:     'linear-gradient(135deg,#22c55e,#16a34a)',
      accentBtnDis:  'rgba(34,197,94,0.2)',
      accentBtnShadow: '0 4px 16px rgba(34,197,94,0.30)',
      /* pills */
      pillDefault:   'rgba(255,255,255,0.04)',
      pillBorder:    'rgba(255,255,255,0.10)',
      pillText:      '#a3b8a8',
      /* search */
      searchBg:      'rgba(255,255,255,0.05)',
      searchBorder:  'rgba(74,222,128,0.15)',
      searchFocusBg: 'rgba(255,255,255,0.08)',
      searchFocusBorder: 'rgba(74,222,128,0.40)',
      searchColor:   '#ecfdf5',
      /* card hover shadow */
      cardShadow:    '0 4px 20px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.05)',
      cardHoverShadow: '0 16px 40px rgba(0,0,0,0.50), 0 0 0 1px rgba(74,222,128,0.15), inset 0 1px 0 rgba(255,255,255,0.08)',
      /* category meta */
      catVegColor:'#4ade80', catVegBg:'rgba(74,222,128,0.12)',  catVegBorder:'rgba(74,222,128,0.30)',
      catFruColor:'#f87171', catFruBg:'rgba(248,113,113,0.12)', catFruBorder:'rgba(248,113,113,0.30)',
      catHrbColor:'#fbbf24', catHrbBg:'rgba(251,191,36,0.12)',  catHrbBorder:'rgba(251,191,36,0.30)',
      /* misc */
      imgFilter:     'brightness(0.9) saturate(1.1)',
      imgOverlay:    'linear-gradient(to top,rgba(17,26,20,0.70),transparent)',
      selectScheme:  'dark',
      skeletonBg:    'linear-gradient(90deg,#111a14 25%,#172112 50%,#111a14 75%)',
      colorScheme:   'dark',
    }
  : {
      /* surfaces */
      pageBg:        '#f9fbf9',
      surfaceBg:     '#ffffff',
      cardBg:        '#ffffff',
      heroBg:        'linear-gradient(135deg,#064e3b 0%,#065f46 50%,#047857 100%)',
      /* borders */
      borderDefault: '#f0f0f0',
      borderHover:   'rgba(22,163,74,0.20)',
      borderHero:    'transparent',
      /* text */
      textPrimary:   '#1a1a1a',
      textMuted:     '#888888',
      textDisabled:  '#aaaaaa',
      textPrice:     '#16a34a',
      textStrike:    '#bbbbbb',
      /* accent */
      accent:        '#16a34a',
      accentBtn:     'linear-gradient(135deg,#22c55e,#16a34a)',
      accentBtnDis:  '#86efac',
      accentBtnShadow: '0 4px 12px rgba(22,163,74,0.35)',
      /* pills */
      pillDefault:   '#ffffff',
      pillBorder:    '#d1d5db',
      pillText:      '#555555',
      /* search */
      searchBg:      'rgba(255,255,255,0.12)',
      searchBorder:  'transparent',
      searchFocusBg: 'rgba(255,255,255,0.18)',
      searchFocusBorder: 'rgba(255,255,255,0.50)',
      searchColor:   '#ffffff',
      /* card hover shadow */
      cardShadow:    '0 2px 12px rgba(0,0,0,0.06)',
      cardHoverShadow: '0 12px 32px rgba(0,0,0,0.12)',
      /* category meta */
      catVegColor:'#16a34a', catVegBg:'#dcfce7', catVegBorder:'#bbf7d0',
      catFruColor:'#dc2626', catFruBg:'#fee2e2', catFruBorder:'#fecaca',
      catHrbColor:'#d97706', catHrbBg:'#fef3c7', catHrbBorder:'#fde68a',
      /* misc */
      imgFilter:     'none',
      imgOverlay:    'none',
      selectScheme:  'light',
      skeletonBg:    'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)',
      colorScheme:   'light',
    };

/* ─── Botanical SVG background ─────────────────────────────────────── */
const BotanicalBg = ({ isDark }) => (
  <svg
    aria-hidden="true"
    style={{ position:'fixed', inset:0, width:'100%', height:'100%', zIndex:0, pointerEvents:'none', opacity: isDark ? 0.04 : 0.055 }}
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid slice"
    viewBox="0 0 1200 800"
  >
    <g transform="translate(-40,10) rotate(-20)">
      <ellipse cx="120" cy="130" rx="55" ry="95" fill={isDark?'#4ade80':'#2d8a4e'} />
      <line x1="120" y1="40" x2="120" y2="220" stroke={isDark?'#22c55e':'#1a5c33'} strokeWidth="3"/>
      <line x1="120" y1="80"  x2="85"  y2="110" stroke={isDark?'#22c55e':'#1a5c33'} strokeWidth="1.5"/>
      <line x1="120" y1="110" x2="155" y2="140" stroke={isDark?'#22c55e':'#1a5c33'} strokeWidth="1.5"/>
      <line x1="120" y1="140" x2="82"  y2="170" stroke={isDark?'#22c55e':'#1a5c33'} strokeWidth="1.5"/>
      <line x1="120" y1="165" x2="156" y2="190" stroke={isDark?'#22c55e':'#1a5c33'} strokeWidth="1.5"/>
    </g>
    <g transform="translate(1080,0) rotate(15)">
      <ellipse cx="60" cy="60" rx="20" ry="35" fill={isDark?'#4ade80':'#3aab5e'}/>
      <ellipse cx="90" cy="80" rx="18" ry="30" fill={isDark?'#22c55e':'#2d8a4e'}/>
      <ellipse cx="35" cy="85" rx="16" ry="28" fill={isDark?'#4ade80':'#3aab5e'}/>
      <line x1="60" y1="95" x2="60" y2="180" stroke={isDark?'#22c55e':'#1a5c33'} strokeWidth="2.5"/>
    </g>
    <g transform="translate(30,620) rotate(-10)">
      <polygon points="30,0 55,0 40,100" fill={isDark?'#fb923c':'#e07b39'}/>
      <line x1="42" y1="0" x2="20" y2="-35" stroke={isDark?'#4ade80':'#3aab5e'} strokeWidth="3"/>
      <line x1="42" y1="0" x2="42" y2="-50" stroke={isDark?'#4ade80':'#3aab5e'} strokeWidth="3"/>
      <line x1="42" y1="0" x2="62" y2="-38" stroke={isDark?'#4ade80':'#3aab5e'} strokeWidth="3"/>
    </g>
    <g transform="translate(1050,350)">
      <circle cx="50" cy="65" r="50" fill={isDark?'#f87171':'#d94040'}/>
      <ellipse cx="30" cy="62" rx="14" ry="22" fill={isDark?'#fca5a5':'#e86060'} opacity="0.5"/>
      <path d="M50,18 Q70,-5 80,10" stroke={isDark?'#4ade80':'#3aab5e'} strokeWidth="3" fill="none"/>
      <ellipse cx="70" cy="0" rx="14" ry="9" fill={isDark?'#4ade80':'#3aab5e'}/>
    </g>
    <g transform="translate(540,700)">
      <circle cx="50" cy="55" r="45" fill={isDark?'#f87171':'#e03c3c'}/>
      <ellipse cx="30" cy="52" rx="12" ry="20" fill={isDark?'#fca5a5':'#e86060'} opacity="0.4"/>
      <line x1="50" y1="12" x2="50" y2="-15" stroke={isDark?'#4ade80':'#3aab5e'} strokeWidth="3"/>
      <line x1="50" y1="12" x2="30" y2="-8"  stroke={isDark?'#4ade80':'#3aab5e'} strokeWidth="2"/>
      <line x1="50" y1="12" x2="70" y2="-8"  stroke={isDark?'#4ade80':'#3aab5e'} strokeWidth="2"/>
      <ellipse cx="50" cy="-20" rx="14" ry="8" fill={isDark?'#4ade80':'#3aab5e'}/>
    </g>
    <g transform="translate(1100,680) rotate(25)">
      <ellipse cx="20" cy="50" rx="18" ry="50" fill={isDark?'#22c55e':'#2d8a4e'}/>
      <ellipse cx="55" cy="45" rx="16" ry="44" fill={isDark?'#4ade80':'#3aab5e'}/>
      <ellipse cx="88" cy="52" rx="14" ry="38" fill={isDark?'#22c55e':'#2d8a4e'}/>
      <line x1="20" y1="10" x2="20" y2="100" stroke={isDark?'#16a34a':'#1a5c33'} strokeWidth="2"/>
      <line x1="55" y1="10" x2="55" y2="90"  stroke={isDark?'#16a34a':'#1a5c33'} strokeWidth="2"/>
    </g>
    <g transform="translate(0,380) rotate(-15)">
      <ellipse cx="55" cy="55" rx="40" ry="52" fill={isDark?'#fde047':'#f0d040'}/>
      <ellipse cx="38" cy="48" rx="11" ry="18" fill={isDark?'#fef08a':'#f5e070'} opacity="0.5"/>
    </g>
    {[200,400,650,870].map((x,i)=>(
      <g key={i} transform={`translate(${x},${50+i*30}) rotate(${i*20-20})`}>
        <ellipse cx="10" cy="18" rx="7"  ry="16" fill={isDark?'#4ade80':'#3aab5e'}/>
        <ellipse cx="26" cy="20" rx="6"  ry="14" fill={isDark?'#22c55e':'#2d8a4e'}/>
      </g>
    ))}
  </svg>
);

/* ─── Ambient glow orbs (dark only) ────────────────────────────────── */
const AmbientOrbs = () => (
  <div aria-hidden="true" style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }}>
    <div style={{ position:'absolute', top:-120, left:-80, width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle,rgba(34,197,94,0.12) 0%,transparent 70%)', filter:'blur(40px)' }}/>
    <div style={{ position:'absolute', bottom:-160, right:-100, width:560, height:560, borderRadius:'50%', background:'radial-gradient(circle,rgba(16,163,74,0.10) 0%,transparent 70%)', filter:'blur(60px)' }}/>
    <div style={{ position:'absolute', top:'40%', left:'55%', width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,rgba(74,222,128,0.06) 0%,transparent 70%)', filter:'blur(50px)' }}/>
  </div>
);

/* ─── Discount badge ────────────────────────────────────────────────── */
const DiscountBadge = ({ discount }) => {
  if (!discount?.isActive) return null;
  const label = discount.type === 'percentage' ? `${discount.value}% OFF` : `₹${discount.value} OFF`;
  return (
    <span style={{ position:'absolute', top:10, left:10, background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:20, boxShadow:'0 2px 8px rgba(239,68,68,0.45)', letterSpacing:'0.02em' }}>
      {label}
    </span>
  );
};

/* ─── Product Card ──────────────────────────────────────────────────── */
const ProductCard = ({ p, onAdd, adding, t }) => {
  const discountPct = p.discount?.isActive && p.discount?.type === 'percentage'
    ? parseFloat(p.discount.value) || 0
    : 0;
  const finalPrice = discountPct > 0
    ? (p.price - (p.price * discountPct / 100)).toFixed(2)
    : null;

  const catMap = {
    Vegetables: { color: t.catVegColor, bg: t.catVegBg, border: t.catVegBorder, icon: <Leaf size={16}/> },
    Fruits:     { color: t.catFruColor, bg: t.catFruBg, border: t.catFruBorder, icon: <Apple size={16}/> },
    Herbs:      { color: t.catHrbColor, bg: t.catHrbBg, border: t.catHrbBorder, icon: <Salad size={16}/> },
  };
  const cat = catMap[p.category?.name];
  return (
    <div style={{
      background: t.cardBg, borderRadius:20, overflow:'hidden',
      border:`1px solid ${t.borderDefault}`,
      boxShadow: t.cardShadow,
      transition:'transform 0.22s ease',
      cursor:'pointer', display:'flex', flexDirection:'column',
    }}
      onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow=t.cardHoverShadow; e.currentTarget.style.borderColor=t.borderHover; }}
      onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow=t.cardShadow; e.currentTarget.style.borderColor=t.borderDefault; }}
    >
      <div style={{ position:'relative', height:180, overflow:'hidden', background: t.pageBg }}>
        <img
          src={p.images?.[0]?.url||'https://via.placeholder.com/300x180?text=Fresh+Produce'}
          alt={p.name}
          style={{ width:'100%', height:'100%', objectFit:'cover', transition:'transform 0.4s ease', filter: t.imgFilter }}
          onMouseEnter={e=>e.target.style.transform='scale(1.06)'}
          onMouseLeave={e=>e.target.style.transform='scale(1)'}
        />
        {t.imgOverlay !== 'none' && (
          <div style={{ position:'absolute', bottom:0, left:0, right:0, height:60, background:t.imgOverlay, pointerEvents:'none' }}/>
        )}
        <DiscountBadge discount={p.discount}/>
        {cat && (
          <span style={{ position:'absolute', top:10, right:10, background:cat.bg, color:cat.color, fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:20, display:'flex', alignItems:'center', gap:4, border:`1px solid ${cat.border}`, backdropFilter:'blur(8px)' }}>
            {cat.icon}{p.category.name}
          </span>
        )}
      </div>

      <div style={{ padding:'14px 14px 12px', flex:1, display:'flex', flexDirection:'column' }}>
        <div style={{ fontWeight:700, fontSize:15, color:t.textPrimary, marginBottom:3, lineHeight:1.3 }}>{p.name}</div>
        <div style={{ fontSize:12, color:t.textMuted, marginBottom:8, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
          {p.description||'Premium quality produce directly from local farms.'}
        </div>

        <div style={{ marginTop:'auto', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            {finalPrice ? (
              <div style={{ display:'flex', alignItems:'baseline', gap:5 }}>
                <span style={{ fontSize:12, color:t.textMuted, textDecoration:'line-through' }}>₹{p.price}</span>
                <span style={{ fontSize:18, fontWeight:800, color:t.textPrice }}>₹{finalPrice}</span>
              </div>
            ) : (
              <span style={{ fontSize:18, fontWeight:800, color:t.textPrice }}>₹{p.price}</span>
            )}
            <div style={{ fontSize:11, color:t.textMuted, marginTop:1 }}>per {p.unit} · Stock: {p.stock?.quantity}</div>
          </div>

          <button
            onClick={()=>onAdd(p)}
            disabled={adding===p._id}
            style={{
              background: adding===p._id ? t.accentBtnDis : t.accentBtn,
              color: adding===p._id ? t.accent : '#fff',
              border: adding===p._id ? `1px solid ${t.accent}33` : 'none',
              borderRadius:12, padding:'9px 16px', fontSize:13, fontWeight:700, cursor:'pointer',
              display:'flex', alignItems:'center', gap:5,
              boxShadow: adding===p._id ? 'none' : t.accentBtnShadow,
              transition:'transform 0.18s ease', whiteSpace:'nowrap',
            }}
            onMouseEnter={e=>{ if(adding!==p._id){ e.currentTarget.style.transform='scale(1.05)'; }}}
            onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
          >
            <ShoppingCart size={14}/>
            {adding===p._id ? 'Adding…' : '+ Add'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Recommendation Chip ───────────────────────────────────────────── */
const RecommendChip = ({ p, onAdd, t, isDark }) => (
  <div style={{
    background: isDark ? 'rgba(10,20,14,0.45)' : '#ffffff', position: 'relative',
    minHeight: 90,
    backdropFilter: isDark ? 'blur(18px) saturate(180%)' : 'none',
    WebkitBackdropFilter: isDark ? 'blur(18px) saturate(180%)' : 'none',
    borderRadius:18, padding:'12px 14px', display:'flex', alignItems:'center', gap:12,
    border: isDark ? '1px solid rgba(74,222,128,0.18)' : '1px solid #e8f5e9',
    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.06)' : '0 2px 10px rgba(0,0,0,0.05)',
    minWidth:220, flexShrink:0, transition:'transform 0.2s ease',
  }}
    onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-3px)'; }}
    onMouseLeave={e=>{ e.currentTarget.style.transform='translateY(0)'; }}
  >
    <img
      src={p.images?.[0]?.url||'https://via.placeholder.com/60?text=Fresh'}
      style={{ width:56, height:56, borderRadius:12, objectFit:'cover', flexShrink:0, border:`1.5px solid ${isDark?'rgba(74,222,128,0.25)':'#e8f5e9'}` }}
      alt={p.name}
    />
    <div style={{ flex:1, minWidth:0 }}>
      <div style={{ fontWeight:700, fontSize:14, color:t.textPrimary, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.name}</div>
      <div style={{ fontSize:12, color:t.textPrice, fontWeight:600, marginBottom:6 }}>₹{p.price} / {p.unit}</div>
      <button
  onClick={() => onAdd(p)}
  style={{
    position: 'absolute',
    right: 14,
    bottom: 12,

    background: isDark ? 'rgba(34,197,94,0.12)' : '#f0fdf4',
    color: t.accent,
    border: isDark
      ? '1px solid rgba(74,222,128,0.30)'
      : '1.5px solid #bbf7d0',
    borderRadius: 8,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = isDark
      ? 'rgba(34,197,94,0.22)'
      : '#dcfce7';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = isDark
      ? 'rgba(34,197,94,0.12)'
      : '#f0fdf4';
  }}
>
  + Add
</button>
    </div>
  </div>
);
/* ─── Main Component ────────────────────────────────────────────────── */
const BuyerMarketplace = () => {
  const dispatch    = useDispatch();
  const showToast   = useToast();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const { theme }   = useTheme();                // ← reads the same context Navbar writes to
  const isDark      = theme === 'dark';
  const t           = getTokens(isDark);          // ← all colour decisions come from here

    const recommendationRef = React.useRef(null);

  const [search,           setSearch]           = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [adding,           setAdding]           = useState(null);
  const [sortBy,           setSortBy]           = useState('default');

  const { data: dashboardData } = useQuery({
    queryKey: ['buyerDashboard'],
    queryFn: async () => { const r = await api.get('/analytics/buyer'); return r.data.data; },
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['marketplaceProducts', search, selectedCategory],
    queryFn: async () => {
      const r = await api.get('/products', { params: { search: search||undefined, category: selectedCategory||undefined, limit: 30 } });
      return r.data.data.products;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => [
      { _id: '64f0b2f384a56c001712aabc', name: 'Vegetables' },
      { _id: '64f0b2f384a56c001712aabd', name: 'Fruits' },
      { _id: '64f0b2f384a56c001712aabe', name: 'Herbs' },
    ],
  });

   const scrollRecommendations = () => {
    recommendationRef.current?.scrollBy({
      left: 320,
      behavior: 'smooth',
    });
  };
  const scrollRecommendationsLeft = () => {
  recommendationRef.current?.scrollBy({
    left: -320,
    behavior: 'smooth',
  });
};

  const handleAddToCart = async (product) => {
    try {
      setAdding(product._id);
      await dispatch(addItemToCart({ productId: product._id, quantity: 1 }));
      showToast({ title:'Added to Cart!', sub:`${product.name} · 1 ${product.unit}`, variant:'success', action:{ label:'View Cart', onClick:()=>navigate('/cart') }, duration:3000 });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    } catch (err) {
      console.error(err);
      showToast({ title:'Failed to add item', sub:'Please try again', variant:'error', duration:3000 });
    } finally {
      setAdding(null);
    }
  };

  const sortedProducts = React.useMemo(() => {
    if (!productsData) return [];
    const arr = [...productsData];
    if (sortBy === 'price-asc')  arr.sort((a,b)=>(a.effectivePrice||a.price)-(b.effectivePrice||b.price));
    if (sortBy === 'price-desc') arr.sort((a,b)=>(b.effectivePrice||b.price)-(a.effectivePrice||a.price));
    return arr;
  }, [productsData, sortBy]);

  const catMeta = {
    Vegetables: { icon:<Leaf size={16}/>,  color:t.catVegColor, bg:t.catVegBg, border:t.catVegBorder },
    Fruits:     { icon:<Apple size={16}/>, color:t.catFruColor, bg:t.catFruBg, border:t.catFruBorder },
    Herbs:      { icon:<Salad size={16}/>, color:t.catHrbColor, bg:t.catHrbBg, border:t.catHrbBorder },
  };

  return (
    <div className="app-container" style={{ colorScheme: t.colorScheme }}>
      <Sidebar />
      <div className="main-content" style={{ position:'relative', background:t.pageBg, minHeight:'100vh' }}>
        <BotanicalBg isDark={isDark}/>
        {isDark && <AmbientOrbs/>}
        <Navbar/>

        <div style={{ position:'relative', zIndex:1, padding:'0 24px 40px' }}>

          {/* ── Hero banner ──────────────────────────────────────── */}
          <div style={{
            background: t.heroBg,
            borderRadius:24, padding:'32px 36px', marginBottom:28,
            position:'relative', overflow:'hidden',
            border:`1px solid ${t.borderHero}`,
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.40), inset 0 1px 0 rgba(74,222,128,0.08)' : 'none',
          }}>
            {/* decorative circles */}
            {[['-60px','-60px',220,isDark?'rgba(34,197,94,0.06)':'rgba(255,255,255,0.04)'],
              ['-20px','60%',140,isDark?'rgba(74,222,128,0.05)':'rgba(255,255,255,0.06)'],
              ['auto','-30px',160,isDark?'rgba(16,163,74,0.04)':'rgba(255,255,255,0.03)']
            ].map(([top,right,size,color],i)=>(
              <div key={i} style={{ position:'absolute', top, right, width:size, height:size, borderRadius:'50%', background:color, pointerEvents:'none', filter: isDark?'blur(20px)':'none' }}/>
            ))}
            {isDark && <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(74,222,128,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(74,222,128,0.03) 1px,transparent 1px)', backgroundSize:'32px 32px', borderRadius:24, pointerEvents:'none' }}/>}

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:20, position:'relative', zIndex:1 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <Leaf size={18} color={isDark?'#4ade80':'#6ee7b7'}/>
                  <span style={{ color:isDark?'#4ade80':'#6ee7b7', fontSize:13, fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' }}>Farm Flow Marketplace</span>
                </div>
                <h1 style={{ color:'#fff', margin:0, fontSize:28, fontWeight:800, lineHeight:1.25, marginBottom:6 }}>Fresh Produce, Delivered Fast</h1>
                <p style={{ color: isDark?'#4d6655':'#a7f3d0', margin:0, fontSize:14 }}>Sourced directly from local farms · Seasonal & organic picks</p>
              </div>
              <div style={{ display:'flex', gap:10, flex:1, maxWidth:520, minWidth:280 }}>
                <div style={{ flex:1, position:'relative' }}>
                  <Search size={16} color={isDark?'#4ade80':'#6ee7b7'} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                  <input
                    type="text"
                    placeholder="Search tomatoes, spinach, mango…"
                    value={search}
                    onChange={e=>setSearch(e.target.value)}
                    style={{
                      width:'100%', boxSizing:'border-box',
                      paddingLeft:40, paddingRight:14, paddingTop:11, paddingBottom:11,
                      borderRadius:14, border:`1px solid ${t.searchBorder}`,
                      fontSize:14, background:t.searchBg, color:t.searchColor,
                      outline:'none', backdropFilter:'blur(12px)',
                    }}
                    onFocus={e=>{ e.target.style.borderColor=t.searchFocusBorder; e.target.style.background=t.searchFocusBg; }}
                    onBlur={e=>{ e.target.style.borderColor=t.searchBorder; e.target.style.background=t.searchBg; }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Category pills ───────────────────────────────────── */}
          <div style={{ display:'flex', gap:10, marginBottom:24, flexWrap:'wrap', alignItems:'center' }}>
            <button
              onClick={()=>setSelectedCategory('')}
              style={{
                padding:'8px 18px', borderRadius:50, fontSize:13, fontWeight:600, cursor:'pointer',
                border: selectedCategory==='' ? `1.5px solid ${t.accent}` : `1.5px solid ${t.pillBorder}`,
                background: selectedCategory==='' ? (isDark?'rgba(34,197,94,0.12)':'#f0fdf4') : t.pillDefault,
                color: selectedCategory==='' ? t.accent : t.pillText,
              }}
            >All</button>

            {categories.map(c=>{
              const m = catMeta[c.name] || {};
              const isActive = selectedCategory === c._id;
              return (
                <button
                  key={c._id}
                  onClick={()=>setSelectedCategory(isActive?'':c._id)}
                  style={{
                    padding:'8px 18px', borderRadius:50, fontSize:13, fontWeight:600, cursor:'pointer',
                    border: isActive ? `1.5px solid ${m.border||t.accent}` : `1.5px solid ${t.pillBorder}`,
                    background: isActive ? (m.bg||'rgba(34,197,94,0.12)') : t.pillDefault,
                    color: isActive ? (m.color||t.accent) : t.pillText,
                    display:'flex', alignItems:'center', gap:6,
                  }}
                >
                  {m.icon} {c.name}
                </button>
              );
            })}

            <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
              <SlidersHorizontal size={15} color={t.textDisabled}/>
              <select
                value={sortBy}
                onChange={e=>setSortBy(e.target.value)}
                style={{
                  border:`1.5px solid ${t.pillBorder}`, borderRadius:10, padding:'7px 12px',
                  fontSize:13, color:t.textMuted, background:t.pillDefault,
                  cursor:'pointer', outline:'none', colorScheme: t.selectScheme,
                }}
              >
                <option value="default">Sort: Recommended</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>
          </div>

          {/* ── AI Recommendations with glass PNG background ──────── */}
          {dashboardData?.recommendations?.length > 0 && (
            <div style={{ marginBottom:30, position:'relative', borderRadius:24, overflow:'hidden' }}>
              {/* PNG image layer */}
              <div style={{
                position:'absolute', inset:0,
                backgroundImage:`url('/recommendation-bg.png')`,
                backgroundSize:'cover', backgroundPosition:'center',
                filter: isDark ? 'brightness(0.35) saturate(0.8)' : 'brightness(0.55) saturate(0.9)',
                zIndex:0, borderRadius:24,
              }}/>
              {/* Gradient overlay */}
              <div style={{
                position:'absolute', inset:0, zIndex:1, borderRadius:24,
                background: isDark
                  ? 'linear-gradient(135deg,rgba(7,26,15,0.75) 0%,rgba(10,20,14,0.65) 100%)'
                  : 'linear-gradient(135deg,rgba(6,78,59,0.82) 0%,rgba(4,120,87,0.75) 100%)',
              }}/>
              {/* Glass shimmer top edge */}
              <div style={{
                position:'absolute', top:0, left:0, right:0, height:1,
                background:`linear-gradient(90deg,transparent 0%,${isDark?'rgba(74,222,128,0.4)':'rgba(167,243,208,0.6)'} 30%,rgba(255,255,255,0.2) 50%,${isDark?'rgba(74,222,128,0.4)':'rgba(167,243,208,0.6)'} 70%,transparent 100%)`,
                zIndex:3,
              }}/>

              <div style={{ position:'relative', zIndex:2, padding:'22px 22px 18px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ background:'linear-gradient(135deg,rgba(251,191,36,0.9),rgba(245,158,11,0.9))', borderRadius:10, padding:'6px 8px', display:'flex', boxShadow:'0 4px 12px rgba(245,158,11,0.35)' }}>
                      <Sparkles size={16} color="#fff"/>
                    </div>
                    <div>
                      <div style={{ fontWeight:800, fontSize:16, color:'#ecfdf5' }}>Recommended for You</div>
                      <div style={{ fontSize:12, color:'rgba(167,243,208,0.70)' }}>Based on your shopping history</div>
                    </div>
                  </div>
                  <button style={{
                    color:'#ecfdf5', background:'rgba(255,255,255,0.10)', border:'1px solid rgba(255,255,255,0.20)',
                    borderRadius:20, padding:'6px 14px', fontSize:13, fontWeight:600, cursor:'pointer',
                    display:'flex', alignItems:'center', gap:4, backdropFilter:'blur(8px)',
                  }}>
                    View all <ChevronRight size={14}/>
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
  <div
    ref={recommendationRef}
    style={{
      display: 'flex',
      gap: 12,
      overflowX: 'auto',
      scrollBehavior: 'smooth',
    }}
  >
    {dashboardData.recommendations.map((p) => (
      <RecommendChip
        key={p._id}
        p={p}
        onAdd={handleAddToCart}
        t={t}
        isDark={isDark}
      />
    ))}
  </div>

  {/* Left Arrow */}
 <button
  onClick={scrollRecommendationsLeft}
  style={{
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',

    width: 42,
    height: 42,
    borderRadius: '50%',

    background: isDark
      ? 'rgba(10,20,14,0.75)'
      : 'rgba(255,255,255,0.95)',

    border: isDark
      ? '1px solid rgba(74,222,128,0.25)'
      : '1px solid rgba(22,163,74,0.15)',

    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',

    color: t.accent,
    cursor: 'pointer',

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    boxShadow: isDark
      ? '0 4px 20px rgba(0,0,0,0.45)'
      : '0 4px 12px rgba(0,0,0,0.08)',

    zIndex: 10,
  }}
>
  <ChevronLeft size={20} />
</button>

  {/* Right Arrow */}
  <button
  onClick={scrollRecommendations}
  style={{
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: 'translateY(-50%)',

    width: 42,
    height: 42,
    borderRadius: '50%',

    background: isDark
      ? 'rgba(10,20,14,0.75)'
      : 'rgba(255,255,255,0.95)',

    border: isDark
      ? '1px solid rgba(74,222,128,0.25)'
      : '1px solid rgba(22,163,74,0.15)',

    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',

    color: t.accent,
    cursor: 'pointer',

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',

    boxShadow: isDark
      ? '0 4px 20px rgba(0,0,0,0.45)'
      : '0 4px 12px rgba(0,0,0,0.08)',

    zIndex: 10,
  }}
>
  <ChevronRight size={20} />
</button>
</div>
              </div>
            </div>
          )}

          {/* ── Section header ──────────────────────────────────── */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <TrendingUp size={18} color={t.accent}/>
              <span style={{ fontWeight:800, fontSize:17, color:t.textPrimary }}>
                {search ? `Results for "${search}"` : 'All Products'}
              </span>
              {!isLoading && (
                <span style={{ background:isDark?'rgba(34,197,94,0.12)':'#f0fdf4', color:t.accent, fontSize:12, fontWeight:700, padding:'2px 8px', borderRadius:20, border:`1px solid ${isDark?'rgba(74,222,128,0.25)':'#bbf7d0'}` }}>
                  {sortedProducts.length} items
                </span>
              )}
            </div>
          </div>

          {/* ── Product Grid ─────────────────────────────────────── */}
          {isLoading ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:20 }}>
              {[...Array(8)].map((_,i)=>(
                <div key={i} style={{ borderRadius:20, height:320, border:`1px solid ${t.borderDefault}`, background:t.skeletonBg, backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }}/>
              ))}
            </div>
          ) : sortedProducts.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <Leaf size={48} color={isDark?'#172112':'#d1fae5'} style={{ marginBottom:12 }}/>
              <div style={{ fontSize:18, fontWeight:700, color:t.textMuted, marginBottom:6 }}>No products found</div>
              <div style={{ fontSize:14, color:t.textDisabled }}>Try a different search or category</div>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:20 }}>
              {sortedProducts.map(p=>(
                <ProductCard key={p._id} p={p} onAdd={handleAddToCart} adding={adding} t={t}/>
              ))}
            </div>
          )}
        </div>

        <style>{`
          @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
          input::placeholder { color: ${isDark?'rgba(77,102,85,0.8)':'rgba(255,255,255,0.55)'}; }
          ::-webkit-scrollbar { width:4px; height:4px; }
          ::-webkit-scrollbar-track { background:transparent; }
          ::-webkit-scrollbar-thumb { background:${isDark?'rgba(74,222,128,0.2)':'rgba(22,163,74,0.25)'}; border-radius:4px; }
          ::-webkit-scrollbar-thumb:hover { background:${isDark?'rgba(74,222,128,0.35)':'rgba(22,163,74,0.45)'}; }
          .theme-switching, .theme-switching * { transition: none !important; }
        `}</style>
      </div>
    </div>
  );
};

export default BuyerMarketplace;
