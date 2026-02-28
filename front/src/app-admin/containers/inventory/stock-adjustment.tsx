import React, {FunctionComponent, useEffect, useRef, useState} from 'react';
import {DashboardLayout} from "../layout/dashboard.layout";
import {useTranslation} from "react-i18next";
import {jsonRequest} from "../../../api/request/request";
import {PRODUCT_LIST, STORE_LIST, STOCK_ADJUSTMENT} from "../../../api/routing/routes/backend.app";
import {DASHBOARD, STOCK_ADJUSTMENT as STOCK_ADJUSTMENT_ROUTE} from "../../routes/frontend.routes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProductStore {
  id: number;
  store: {
    id: number;
    name: string;
  };
  quantity: number;
}

interface Product {
  id: number;
  name: string;
  barcode: string;
  productStores?: ProductStore[];
}

interface StoreOption {
  id: number;
  name: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const StockAdjustment: FunctionComponent = () => {
  const {t} = useTranslation();

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);

  // Product autocomplete
  const [searchText, setSearchText] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Form fields
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [newQuantity, setNewQuantity] = useState<string>('');
  const [reason, setReason] = useState('');

  // UI state
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingStores, setLoadingStores] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await jsonRequest(PRODUCT_LIST);
      const json = await response.json();
      setProducts((json['hydra:member'] || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode ?? '',
        productStores: p.productStores ?? [],
      })));
    } catch {
      // silently handled
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchStores = async () => {
    setLoadingStores(true);
    try {
      const response = await jsonRequest(STORE_LIST);
      const json = await response.json();
      setStores((json['hydra:member'] || []).map((s: any) => ({id: s.id, name: s.name})));
    } catch {
      // silently handled
    } finally {
      setLoadingStores(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchStores();
  }, []);

  // ---------------------------------------------------------------------------
  // Close autocomplete dropdown on outside click
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---------------------------------------------------------------------------
  // Autocomplete helpers
  // ---------------------------------------------------------------------------

  const filteredProducts = searchText.trim().length > 0
    ? products.filter(p => {
        const term = searchText.toLowerCase();
        return (
          p.name.toLowerCase().includes(term) ||
          (p.barcode && p.barcode.toLowerCase().includes(term))
        );
      }).slice(0, 10)
    : [];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchText(val);
    setDropdownOpen(val.trim().length > 0);
    if (selectedProduct) {
      setSelectedProduct(null);
      setSelectedStoreId('');
      setNewQuantity('');
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSearchText(product.name);
    setDropdownOpen(false);
    setSelectedStoreId('');
    setNewQuantity('');
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  // ---------------------------------------------------------------------------
  // Current stock lookup
  // ---------------------------------------------------------------------------

  const getCurrentStock = (): number | null => {
    if (!selectedProduct || !selectedStoreId) return null;
    const storeIdNum = Number(selectedStoreId);
    const ps = (selectedProduct.productStores || []).find(
      (s) => s.store?.id === storeIdNum
    );
    return ps ? ps.quantity : 0;
  };

  const currentStock = getCurrentStock();

  // ---------------------------------------------------------------------------
  // Form submission
  // ---------------------------------------------------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!selectedProduct) {
      setErrorMessage(t('Please select a product.'));
      return;
    }
    if (!selectedStoreId) {
      setErrorMessage(t('Please select a store.'));
      return;
    }
    if (newQuantity === '' || isNaN(Number(newQuantity)) || Number(newQuantity) < 0) {
      setErrorMessage(t('Please enter a valid quantity (0 or more).'));
      return;
    }

    setSubmitting(true);
    try {
      const response = await jsonRequest(STOCK_ADJUSTMENT, {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProduct.id,
          storeId: Number(selectedStoreId),
          newQuantity: Number(newQuantity),
          reason: reason.trim(),
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(
          errorJson?.errorMessage ?? errorJson?.message ?? response.statusText
        );
      }

      setSuccessMessage(t('Stock adjusted successfully.'));
      // Reset form after success
      setSelectedProduct(null);
      setSearchText('');
      setSelectedStoreId('');
      setNewQuantity('');
      setReason('');
      // Refresh product list so displayed quantities are up to date
      fetchProducts();
    } catch (err: any) {
      setErrorMessage(err?.message ?? t('An error occurred while adjusting stock.'));
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <DashboardLayout
      title={t('Stock Adjustment')}
      breadCrumbs={[
        {title: t('Home'), link: DASHBOARD},
        {title: t('Inventory')},
        {title: t('Stock Adjustment'), current: true},
      ]}
    >
      <div className="row justify-content-center">
        <div className="col-lg-7 col-xl-6">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">{t('Adjust Stock Quantity')}</h5>
            </div>
            <div className="card-body">

              {successMessage && (
                <div className="alert alert-success alert-dismissible" role="alert">
                  {successMessage}
                  <button
                    type="button"
                    className="btn-close"
                    aria-label={t('Close')}
                    onClick={() => setSuccessMessage(null)}
                  />
                </div>
              )}

              {errorMessage && (
                <div className="alert alert-danger alert-dismissible" role="alert">
                  {errorMessage}
                  <button
                    type="button"
                    className="btn-close"
                    aria-label={t('Close')}
                    onClick={() => setErrorMessage(null)}
                  />
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>

                {/* Product search */}
                <div className="mb-3" ref={autocompleteRef} style={{position: 'relative'}}>
                  <label className="form-label fw-semibold" htmlFor="productSearch">
                    {t('Product')}
                  </label>
                  <input
                    id="productSearch"
                    type="text"
                    className="form-control"
                    placeholder={t('Search by name or barcode...')}
                    value={searchText}
                    onChange={handleSearchChange}
                    onFocus={() => {
                      if (searchText.trim().length > 0) setDropdownOpen(true);
                    }}
                    autoComplete="off"
                    disabled={loadingProducts}
                  />
                  {loadingProducts && (
                    <div className="form-text text-muted">
                      <span
                        className="spinner-border spinner-border-sm me-1"
                        role="status"
                        aria-hidden="true"
                      />
                      {t('Loading products...')}
                    </div>
                  )}

                  {/* Autocomplete dropdown */}
                  {dropdownOpen && filteredProducts.length > 0 && (
                    <ul
                      className="list-group shadow-sm"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1050,
                        maxHeight: 240,
                        overflowY: 'auto',
                        border: '1px solid #dee2e6',
                        borderRadius: '0 0 0.375rem 0.375rem',
                        marginTop: 2,
                      }}
                    >
                      {filteredProducts.map((product) => (
                        <li
                          key={product.id}
                          className="list-group-item list-group-item-action"
                          style={{cursor: 'pointer'}}
                          onMouseDown={(e) => {
                            e.preventDefault(); // prevent blur from closing before select
                            handleProductSelect(product);
                          }}
                        >
                          <span className="fw-semibold">{product.name}</span>
                          {product.barcode && (
                            <span className="text-muted ms-2 small">
                              ({product.barcode})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {dropdownOpen && searchText.trim().length > 0 && filteredProducts.length === 0 && !loadingProducts && (
                    <div
                      className="border rounded-bottom bg-white shadow-sm p-2 text-muted small"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1050,
                        marginTop: 2,
                      }}
                    >
                      {t('No products found.')}
                    </div>
                  )}
                </div>

                {/* Store selector */}
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="storeSelect">
                    {t('Store')}
                  </label>
                  <select
                    id="storeSelect"
                    className="form-select"
                    value={selectedStoreId}
                    onChange={(e) => {
                      setSelectedStoreId(e.target.value);
                      setSuccessMessage(null);
                      setErrorMessage(null);
                    }}
                    disabled={loadingStores || !selectedProduct}
                  >
                    <option value="">{t('Select a store...')}</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {!selectedProduct && (
                    <div className="form-text text-muted">
                      {t('Select a product first.')}
                    </div>
                  )}
                </div>

                {/* Current stock display */}
                {selectedProduct && selectedStoreId && (
                  <div className="mb-3">
                    <div className="p-3 rounded bg-light border d-flex align-items-center justify-content-between">
                      <span className="text-secondary fw-semibold">{t('Current Stock')}</span>
                      <span
                        className={`fs-5 fw-bold ${
                          currentStock === null
                            ? 'text-muted'
                            : currentStock <= 0
                            ? 'text-danger'
                            : currentStock <= 10
                            ? 'text-warning'
                            : 'text-success'
                        }`}
                      >
                        {currentStock === null ? '—' : currentStock}
                      </span>
                    </div>
                  </div>
                )}

                {/* New quantity */}
                <div className="mb-3">
                  <label className="form-label fw-semibold" htmlFor="newQuantity">
                    {t('New Quantity')}
                  </label>
                  <input
                    id="newQuantity"
                    type="number"
                    className="form-control"
                    min={0}
                    step={1}
                    placeholder={t('Enter new quantity...')}
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    disabled={!selectedProduct || !selectedStoreId}
                  />
                  <div className="form-text text-muted">
                    {t('This value replaces the current stock quantity entirely.')}
                  </div>
                </div>

                {/* Reason */}
                <div className="mb-4">
                  <label className="form-label fw-semibold" htmlFor="adjustmentReason">
                    {t('Reason')}
                  </label>
                  <input
                    id="adjustmentReason"
                    type="text"
                    className="form-control"
                    placeholder={t('e.g. Inventory count correction, damaged goods...')}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={!selectedProduct || !selectedStoreId}
                  />
                </div>

                {/* Submit */}
                <div className="d-grid">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      submitting ||
                      !selectedProduct ||
                      !selectedStoreId ||
                      newQuantity === ''
                    }
                  >
                    {submitting ? (
                      <>
                        <span
                          className="spinner-border spinner-border-sm me-2"
                          role="status"
                          aria-hidden="true"
                        />
                        {t('Saving...')}
                      </>
                    ) : (
                      t('Apply Adjustment')
                    )}
                  </button>
                </div>

              </form>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
