import React, {useMemo, useState, useCallback} from "react";
import {Product} from "../../../api/model/product";
import {getRealProductPrice} from "../../containers/dashboard/pos";
import {useTranslation} from "react-i18next";
import {Category} from "../../../api/model/category";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faBoxOpen, faLayerGroup} from "@fortawesome/free-solid-svg-icons";
import classNames from "classnames";

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
//  ProductCard
// ═══════════════════════════════════════════
const ProductCard = React.memo(({product, onClick}: {
  product: Product; onClick: () => void;
}) => {
  const price = getRealProductPrice(product);
  const mediaUrl = getMediaUrl(product);
  const [imgOk, setImgOk] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const stock = product.stores?.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
    ?? product.quantity ?? 0;
  const low = Number(stock) <= 5 && Number(stock) > 0;
  const out = Number(stock) <= 0;
  const noImg = !mediaUrl || imgErr;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className="product-grid-card"
      style={{ opacity: out ? 0.5 : 1 }}
    >
      {/* ── Image area ── */}
      <div className="product-grid-image">
        {mediaUrl && !imgErr && (
          <img
            src={mediaUrl}
            alt={product.name}
            loading="lazy"
            onLoad={() => setImgOk(true)}
            onError={() => setImgErr(true)}
            style={{ opacity: imgOk ? 1 : 0 }}
          />
        )}

        {/* Placeholder icon */}
        <div className={classNames("product-grid-placeholder", { hidden: !noImg })}>
          <FontAwesomeIcon icon={faBoxOpen} />
        </div>

        {/* Stock badges */}
        {out && (
          <div className="product-grid-badge out">
            Rupture
          </div>
        )}
        {low && !out && (
          <div className="product-grid-badge low">
            {Number(stock).toFixed(0)} rest.
          </div>
        )}
      </div>

      {/* ── Product info ── */}
      <div className="product-grid-info">
        <div className="product-grid-name" title={product.name}>
          {product.name}
        </div>
        <div className="product-grid-price">
          {Number(price).toLocaleString('fr-FR')} <span style={{ fontSize: '11px', fontWeight: 600 }}>MRU</span>
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

  return (
    <div className="product-grid-container">
      {/* ─── Category bar ─── */}
      <div className="product-grid-categories">
        <button
          onClick={clearCategories}
          className={classNames("category-chip", { active: selectedCategoryIds.length === 0 })}>
          <FontAwesomeIcon icon={faLayerGroup} style={{ marginInlineEnd: '6px', fontSize: '10px' }} />
          {t('All')}
        </button>
        {availableCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat)}
            className={classNames("category-chip", { active: selectedCategoryIds.includes(cat.id.toString()) })}
          >
            {cat.name}
          </button>
        ))}
        <div className="product-grid-count">
          {items.length}
        </div>
      </div>

      {/* ─── Product grid — scrollable ─── */}
      <div className="product-grid pg-scroll">
        {items.length > 0 ? (
          items.map((item) => (
            <ProductCard
              key={item.id}
              product={item}
              onClick={() => addItem(item, 1)}
            />
          ))
        ) : (
          <div className="product-grid-empty">
            <FontAwesomeIcon icon={faBoxOpen} />
            <p>{t('No data available')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
