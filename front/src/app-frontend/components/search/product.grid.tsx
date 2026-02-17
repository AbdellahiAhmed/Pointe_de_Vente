import React, {useMemo, useState, useCallback, useEffect} from "react";
import {Product} from "../../../api/model/product";
import {getRealProductPrice} from "../../containers/dashboard/pos";
import {useTranslation} from "react-i18next";
import {Category} from "../../../api/model/category";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faBoxOpen, faLayerGroup} from "@fortawesome/free-solid-svg-icons";

interface ProductGridProps {
  items: Product[];
  addItem: (item: Product, quantity: number) => void;
  categories: { [key: string]: Category };
  setCategories: (categories: { [key: string]: Category }) => void;
}

const getMediaUrl = (product: Product): string | null => {
  if (!product.media) return null;
  return `/api/media/${product.media.id}/content`;
};

// ═══════════════════════════════════════════
//  Design tokens — light POS theme
// ═══════════════════════════════════════════
const T = {
  bg: '#f0f2f5',
  surface: '#ffffff',
  border: '#e2e8f0',
  borderHover: '#0d9488',
  text: '#1e293b',
  textMuted: '#64748b',
  textFaint: '#94a3b8',
  accent: '#0d9488',
  accentLight: '#ccfbf1',
  accentDark: '#0f766e',
  danger: '#ef4444',
  warning: '#f59e0b',
  shadow: '0 1px 3px rgba(0,0,0,0.08)',
  shadowHover: '0 4px 12px rgba(0,0,0,0.12)',
  radius: '10px',
  placeholderBg: '#f1f5f9',
  placeholderIcon: '#cbd5e1',
  scrollThumb: '#cbd5e1',
};

// ═══════════════════════════════════════════
//  Keyframes injection
// ═══════════════════════════════════════════
const STYLE_ID = 'pos-grid-kf';
const injectKeyframes = () => {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    .pg-scroll::-webkit-scrollbar { width: 6px; }
    .pg-scroll::-webkit-scrollbar-track { background: transparent; }
    .pg-scroll::-webkit-scrollbar-thumb { background: ${T.scrollThumb}; border-radius: 4px; }
    .pg-scroll::-webkit-scrollbar-thumb:hover { background: ${T.accent}; }
    .pg-cats::-webkit-scrollbar { height: 0; }
  `;
  document.head.appendChild(s);
};

// ═══════════════════════════════════════════
//  ProductCard
// ═══════════════════════════════════════════
const ProductCard = React.memo(({product, onClick}: {
  product: Product; onClick: () => void;
}) => {
  const price = getRealProductPrice(product);
  const mediaUrl = getMediaUrl(product);
  const [hover, setHover] = useState(false);
  const [imgOk, setImgOk] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const stock = product.stores?.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
    ?? product.quantity ?? 0;
  const low = Number(stock) <= 5 && Number(stock) > 0;
  const out = Number(stock) <= 0;
  const noImg = !mediaUrl || imgErr;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: T.surface,
        border: `1.5px solid ${hover ? T.borderHover : T.border}`,
        borderRadius: T.radius,
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: hover ? T.shadowHover : T.shadow,
        opacity: out ? 0.5 : 1,
      }}
    >
      {/* ── Image area — explicit height ── */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '150px',
        overflow: 'hidden',
        background: T.placeholderBg,
        flexShrink: 0,
      }}>
        {mediaUrl && !imgErr && (
          <img
            src={mediaUrl}
            alt={product.name}
            loading="lazy"
            onLoad={() => setImgOk(true)}
            onError={() => setImgErr(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.3s ease, opacity 0.3s ease',
              transform: hover ? 'scale(1.05)' : 'scale(1)',
              opacity: imgOk ? 1 : 0,
            }}
          />
        )}

        {/* Placeholder icon */}
        {noImg && (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <FontAwesomeIcon icon={faBoxOpen} style={{
              fontSize: '36px',
              color: T.placeholderIcon,
            }} />
          </div>
        )}

        {/* Stock badge */}
        {out && (
          <div style={{
            position: 'absolute',
            top: '8px', right: '8px',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase' as const,
            background: T.danger,
            color: '#fff',
          }}>
            Rupture
          </div>
        )}
        {low && !out && (
          <div style={{
            position: 'absolute',
            top: '8px', right: '8px',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 700,
            background: T.warning,
            color: '#fff',
          }}>
            {Number(stock).toFixed(0)} rest.
          </div>
        )}
      </div>

      {/* ── Product info ── */}
      <div style={{
        padding: '12px 14px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        borderTop: `1px solid ${T.border}`,
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: 600,
          color: T.text,
          lineHeight: '1.4',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }} title={product.name}>
          {product.name}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '4px',
        }}>
          <span style={{
            fontSize: '18px',
            fontWeight: 800,
            color: T.accent,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {Number(price).toLocaleString('fr-FR')}
          </span>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: T.textFaint,
          }}>MRU</span>
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════
//  ProductGrid — main export
// ═══════════════════════════════════════════
export const ProductGrid = ({items, addItem, categories, setCategories}: ProductGridProps) => {
  const {t} = useTranslation();

  useEffect(() => { injectKeyframes(); }, []);

  const availableCategories = useMemo(() => {
    const cats = new Map<number, Category>();
    items.forEach(item => {
      item.categories?.forEach(cat => {
        if (!cats.has(cat.id)) cats.set(cat.id, cat);
      });
    });
    return Array.from(cats.values());
  }, [items]);

  const selectedCategoryIds = Object.keys(categories);

  const toggleCategory = useCallback((cat: Category) => {
    const n = {...categories};
    const k = cat.id.toString();
    if (n[k]) delete n[k]; else n[k] = cat;
    setCategories(n);
  }, [categories, setCategories]);

  const clearCategories = useCallback(() => setCategories({}), [setCategories]);

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px',
    borderRadius: '8px',
    border: active ? `1.5px solid ${T.accent}` : `1.5px solid ${T.border}`,
    background: active ? T.accentLight : T.surface,
    color: active ? T.accentDark : T.textMuted,
    fontSize: '13px',
    fontWeight: active ? 700 : 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      background: T.bg,
      borderRadius: T.radius,
    }}>
      {/* ─── Category bar ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
        background: T.surface,
      }}>
        <div className="pg-cats" style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          flex: 1,
        }}>
          <button onClick={clearCategories} style={chipStyle(selectedCategoryIds.length === 0)}>
            <FontAwesomeIcon icon={faLayerGroup} style={{marginRight: '6px', fontSize: '10px'}} />
            {t('All')}
          </button>
          {availableCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat)}
              style={chipStyle(selectedCategoryIds.includes(cat.id.toString()))}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <div style={{
          fontSize: '11px',
          color: T.textFaint,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          padding: '4px 12px',
          borderRadius: '6px',
          background: T.bg,
        }}>
          {items.length}
        </div>
      </div>

      {/* ─── Product grid — scrollable ─── */}
      <div className="pg-scroll" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px',
        scrollbarWidth: 'thin',
        scrollbarColor: `${T.scrollThumb} transparent`,
      }}>
        {items.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '14px',
            alignItems: 'start',
          }}>
            {items.map((item) => (
              <ProductCard
                key={item.id}
                product={item}
                onClick={() => addItem(item, 1)}
              />
            ))}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px',
            gap: '14px',
          }}>
            <FontAwesomeIcon icon={faBoxOpen} style={{fontSize: '40px', color: T.placeholderIcon}} />
            <p style={{color: T.textFaint, fontSize: '14px', fontWeight: 500}}>
              {t('No data available')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
