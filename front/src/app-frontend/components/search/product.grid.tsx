import React, {useEffect, useMemo, useState, useCallback} from "react";
import {Product} from "../../../api/model/product";
import {getRealProductPrice} from "../../containers/dashboard/pos";
import {useTranslation} from "react-i18next";
import {Category} from "../../../api/model/category";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faBoxOpen, faLayerGroup, faTag} from "@fortawesome/free-solid-svg-icons";
import classNames from "classnames";
import {jsonRequest} from "../../../api/request/request";
import {CATEGORY_LIST} from "../../../api/routing/routes/backend.app";

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
  const {t} = useTranslation();
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
        {/* Placeholder always visible as base layer */}
        {noImg && (
          <div className="product-grid-placeholder">
            <FontAwesomeIcon icon={faBoxOpen} />
          </div>
        )}

        {/* Image overlays placeholder via absolute positioning */}
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

        {/* Stock badges */}
        {out && (
          <div className="product-grid-badge out">
            {t('Out of stock')}
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
export const ProductGrid = ({items, addItem, setCategories}: ProductGridProps) => {
  const {t} = useTranslation();

  // null = "All" selected
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [allCategories, setAllCategories] = useState<Category[]>([]);

  // Fetch ALL categories from API
  const fetchCategories = useCallback(async () => {
    try {
      const res = await jsonRequest(`${CATEGORY_LIST}?isActive=true`);
      const data = await res.json();
      const cats: Category[] = data['hydra:member'] || data.list || [];
      setAllCategories(cats);
    } catch (e) {
      const cats = new Map<number, Category>();
      items.forEach(item => {
        item.categories?.forEach(cat => {
          if (!cats.has(cat.id)) cats.set(cat.id, cat);
        });
      });
      setAllCategories(Array.from(cats.values()));
    }
  }, []);

  // Load on mount + listen for changes from admin panel
  useEffect(() => {
    fetchCategories();
    const handler = () => { fetchCategories(); };
    window.addEventListener('categories-changed', handler);
    return () => window.removeEventListener('categories-changed', handler);
  }, [fetchCategories]);

  // Count how many items belong to each category
  const categoryCountMap = useMemo(() => {
    const counts = new Map<number, number>();
    items.forEach(item => {
      item.categories?.forEach(cat => {
        counts.set(cat.id, (counts.get(cat.id) ?? 0) + 1);
      });
    });
    return counts;
  }, [items]);

  // Select "All"
  const selectAll = useCallback(() => {
    setSelectedCategoryId(null);
    setCategories({});
  }, [setCategories]);

  // Select a single category exclusively
  const selectCategory = useCallback((cat: Category) => {
    setSelectedCategoryId(cat.id);
    setCategories({ [cat.id.toString()]: cat });
  }, [setCategories]);

  // Filter products by selected category
  const filteredItems = useMemo(() => {
    if (selectedCategoryId === null) return items;
    return items.filter(item =>
      item.categories?.some(c => c.id === selectedCategoryId)
    );
  }, [items, selectedCategoryId]);

  return (
    <div className="product-grid-container">

      {/* ─── Category Tile Grid ─── */}
      <div className="category-grid">

        {/* "All" tile */}
        <div
          role="button"
          tabIndex={0}
          data-color={undefined}
          className={classNames(
            "category-tile",
            "category-tile--all",
            { "category-tile--active": selectedCategoryId === null }
          )}
          onClick={selectAll}
          onKeyDown={(e) => e.key === 'Enter' && selectAll()}
        >
          <span className="category-tile__count">{items.length}</span>
          <span className="category-tile__icon">
            <FontAwesomeIcon icon={faLayerGroup} />
          </span>
          <span className="category-tile__name">{t('All')}</span>
        </div>

        {/* Category tiles */}
        {allCategories.map((cat, index) => {
          const colorIndex = ((index % 12) + 1).toString();
          const isActive = selectedCategoryId === cat.id;
          const count = categoryCountMap.get(cat.id) ?? 0;

          return (
            <div
              key={cat.id}
              role="button"
              tabIndex={0}
              data-color={colorIndex}
              className={classNames("category-tile", { "category-tile--active": isActive })}
              onClick={() => selectCategory(cat)}
              onKeyDown={(e) => e.key === 'Enter' && selectCategory(cat)}
            >
              <span className="category-tile__count">{count}</span>
              <span className="category-tile__icon">
                <FontAwesomeIcon icon={faTag} />
              </span>
              <span className="category-tile__name">{cat.name}</span>
            </div>
          );
        })}
      </div>

      {/* ─── Product Panel ─── */}
      <div className="product-panel">
        {filteredItems.length > 0 ? (
          <div className="product-grid-2col">
            {filteredItems.map(item => (
              <ProductCard
                key={item.id}
                product={item}
                onClick={() => addItem(item, 1)}
              />
            ))}
          </div>
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
