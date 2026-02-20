import { Product } from "../../../../api/model/product";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../app-common/components/input/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEye,
  faPlus,
  faInfoCircle,
  faWarehouse,
  faLayerGroup,
  faShoppingCart,
  faTruck,
  faBoxOpen,
  faBarcode,
  faTag,
} from "@fortawesome/free-solid-svg-icons";
import { Modal } from "../../../../app-common/components/modal/modal";
import { Tab, TabContent, TabControl, TabNav } from "../../../../app-common/components/tabs/tabs";
import { withCurrency } from "../../../../lib/currency/currency";
import { createColumnHelper } from "@tanstack/react-table";
import { OrderItem, OrderItemSimple } from "../../../../api/model/order.item";
import { ImportItems } from "./import.items";
import { ExportItems } from "./export.items";
import { TableComponent } from "../../../../app-common/components/table/table";
import useApi from "../../../../api/hooks/use.api";
import { HydraCollection } from "../../../../api/model/hydra";
import { ORDER_PRODUCTS_LIST, PRODUCT_LIST, PURCHASE_ITEM_LIST } from "../../../../api/routing/routes/backend.app";
import { DateTime } from "luxon";
import { DynamicValue } from "../../../../app-common/components/dynamic.value/dynamic.value";
import { PurchaseItem } from "../../../../api/model/purchase.item";

interface Props {
  product: Product;
  show?: boolean;
  onClose?: () => void;
}

const getMediaUrl = (product: Product): string | null => {
  if (!product.media) return null;
  return `/api/media/${product.media.id}/content`;
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}

const StatCard = ({ label, value, valueClassName }: StatCardProps) => (
  <div
    className="flex flex-col items-center justify-center rounded-lg px-4 py-3 min-w-[90px]"
    style={{
      background: "var(--pos-surface, #f8f9fb)",
      border: "1px solid var(--pos-border, #e5e7eb)",
      boxShadow: "var(--pos-shadow-sm, 0 1px 3px rgba(0,0,0,.06))",
    }}
  >
    <span className={`text-base font-bold tabular-nums leading-tight ${valueClassName ?? "text-gray-900"}`}>
      {value}
    </span>
    <span className="text-[11px] text-gray-400 mt-0.5 text-center leading-tight">{label}</span>
  </div>
);

// ─── Info Card ────────────────────────────────────────────────────────────────
interface InfoCardProps {
  title: string;
  icon: typeof faInfoCircle;
  children: React.ReactNode;
}

const InfoCard = ({ title, icon, children }: InfoCardProps) => (
  <div
    className="rounded-xl p-4"
    style={{
      border: "1px solid var(--pos-border, #e5e7eb)",
      boxShadow: "var(--pos-shadow-sm, 0 1px 3px rgba(0,0,0,.06))",
      background: "#fff",
    }}
  >
    <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: "1px solid var(--pos-border, #e5e7eb)" }}>
      <FontAwesomeIcon
        icon={icon}
        className="text-sm"
        style={{ color: "var(--pos-accent, #2563eb)" }}
      />
      <span className="text-[13px] font-semibold text-gray-700 uppercase tracking-wide">{title}</span>
    </div>
    {children}
  </div>
);

// ─── Info Row ─────────────────────────────────────────────────────────────────
interface InfoRowProps {
  label: string;
  children: React.ReactNode;
}

const InfoRow = ({ label, children }: InfoRowProps) => (
  <div className="flex items-start gap-2 py-1.5">
    <span className="text-[12px] text-gray-400 min-w-[110px] text-start shrink-0 pt-0.5">{label}</span>
    <span className="text-[13px] text-gray-800 font-medium text-start flex flex-wrap gap-1">{children}</span>
  </div>
);

// ─── Stock Badge ─────────────────────────────────────────────────────────────
interface StockBadgeProps {
  quantity: number;
  reOrderLevel: number;
}

const StockBadge = ({ quantity, reOrderLevel }: StockBadgeProps) => {
  let className = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ";
  if (quantity <= 0) {
    className += "bg-red-100 text-red-700";
  } else if (quantity <= reOrderLevel) {
    className += "bg-orange-100 text-orange-700";
  } else {
    className += "bg-green-100 text-green-700";
  }
  return <span className={className}>{quantity}</span>;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const ItemComponent = ({ product, show, onClose }: Props) => {
  const { t } = useTranslation();
  const [modal, setModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("information");

  const mediaUrl = getMediaUrl(product);
  const [imgOk, setImgOk] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const totalStock = product.stores.reduce((sum, s) => sum + Number(s.quantity ?? 0), 0);

  const basePriceNum = Number(product.basePrice ?? 0);
  const costNum = Number(product.cost ?? 0);
  const margin =
    basePriceNum > 0 && costNum > 0
      ? (((basePriceNum - costNum) / basePriceNum) * 100).toFixed(1)
      : null;
  const marginPositive = margin !== null && Number(margin) >= 0;

  const tabs = [
    { id: "information", label: t("Item Information"), icon: faInfoCircle },
    { id: "stores",      label: t("Stock"),            icon: faWarehouse   },
    { id: "variants",    label: t("Variants"),          icon: faLayerGroup  },
    { id: "sales",       label: t("Sales"),             icon: faShoppingCart },
    { id: "purchases",   label: t("Purchases"),         icon: faTruck       },
  ];

  return (
    <>
      <Button variant="primary" onClick={() => { setModal(true); setActiveTab("information"); }}>
        <FontAwesomeIcon icon={faEye} />
      </Button>

      <Modal
        onClose={() => setModal(false)}
        shouldCloseOnEsc={true}
        open={modal}
        size="full"
      >
        {/* ═══════════════════════════════════════════════════════════════
            HERO HEADER
        ════════════════════════════════════════════════════════════════ */}
        <div
          className="flex flex-col sm:flex-row gap-4 items-start p-4 mb-4 rounded-xl"
          style={{
            background: "var(--pos-surface, #f8f9fb)",
            border: "1px solid var(--pos-border, #e5e7eb)",
          }}
        >
          {/* Product image */}
          <div
            className="shrink-0 w-[120px] h-[120px] rounded-xl overflow-hidden flex items-center justify-center bg-gray-100"
            style={{ border: "1px solid var(--pos-border, #e5e7eb)" }}
          >
            {mediaUrl && !imgErr ? (
              <>
                {!imgOk && (
                  <FontAwesomeIcon icon={faBoxOpen} className="text-4xl text-gray-300" />
                )}
                <img
                  src={mediaUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  style={{ display: imgOk ? "block" : "none" }}
                  onLoad={() => setImgOk(true)}
                  onError={() => setImgErr(true)}
                />
              </>
            ) : (
              <FontAwesomeIcon icon={faBoxOpen} className="text-4xl text-gray-300" />
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 leading-tight mb-1 text-start">
              {product.name}
            </h2>

            {product.barcode && (
              <div className="flex items-center gap-1.5 mb-2">
                <FontAwesomeIcon icon={faBarcode} className="text-gray-400 text-xs" />
                <span className="text-xs text-gray-400 font-mono">{product.barcode}</span>
              </div>
            )}

            {/* Category chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {product.categories.map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    background: "var(--pos-accent-light, #dbeafe)",
                    color: "var(--pos-accent, #2563eb)",
                    border: "1px solid var(--pos-accent-border, #bfdbfe)",
                  }}
                >
                  <FontAwesomeIcon icon={faTag} className="text-[10px]" />
                  {cat.name}
                </span>
              ))}
            </div>

            {/* Status badges */}
            <div className="flex flex-wrap gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  product.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {product.isActive ? t("Active") : t("Inactive")}
              </span>
              {product.isAvailable === false && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                  {t("Unavailable")}
                </span>
              )}
            </div>
          </div>

          {/* Key metric stat cards */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <StatCard
              label={t("Sale Price")}
              value={withCurrency(product.basePrice)}
              valueClassName="text-gray-900"
            />
            <StatCard
              label={t("PMP (Avg. Cost)")}
              value={costNum > 0 ? withCurrency(product.cost) : "—"}
              valueClassName="text-gray-600"
            />
            <StatCard
              label={t("Margin")}
              value={margin !== null ? `${margin}%` : "—"}
              valueClassName={margin !== null ? (marginPositive ? "text-green-600" : "text-red-500") : "text-gray-400"}
            />
            <StatCard
              label={t("Total Stock")}
              value={totalStock.toLocaleString("fr-FR")}
              valueClassName={
                totalStock <= 0 ? "text-red-500" : totalStock <= 10 ? "text-orange-500" : "text-green-600"
              }
            />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            CUSTOM TABS NAV
        ════════════════════════════════════════════════════════════════ */}
        <div
          className="flex items-end gap-0 mb-4 overflow-x-auto"
          style={{ borderBottom: "2px solid var(--pos-border, #e5e7eb)" }}
          role="tablist"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap
                  border-b-2 transition-colors duration-150 focus:outline-none
                  ${
                    isActive
                      ? "border-[var(--pos-accent,#2563eb)] text-[var(--pos-accent,#2563eb)] bg-white"
                      : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
                style={{ marginBottom: "-2px" }}
                type="button"
              >
                <FontAwesomeIcon icon={tab.icon} className="text-xs" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            TAB PANELS
        ════════════════════════════════════════════════════════════════ */}

        {/* ── Information ────────────────────────────────────────────── */}
        {activeTab === "information" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pricing Card */}
            <InfoCard title={t("Pricing")} icon={faTag}>
              <InfoRow label={t("Sale Price")}>
                <span className="font-semibold text-gray-900">{withCurrency(product.basePrice)}</span>
                {product.saleUnit && (
                  <span className="text-xs text-gray-400">/ {product.saleUnit}</span>
                )}
              </InfoRow>
              {product.minPrice != null && (
                <InfoRow label={t("Min Price")}>
                  {withCurrency(product.minPrice)}
                </InfoRow>
              )}
              <InfoRow label={t("PMP (Avg. Cost)")}>
                <span>{costNum > 0 ? withCurrency(product.cost) : "—"}</span>
                {product.purchaseUnit && (
                  <span className="text-xs text-gray-400">/ {product.purchaseUnit}</span>
                )}
              </InfoRow>
              <InfoRow label={t("Margin")}>
                {margin !== null ? (
                  <span className={marginPositive ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                    {margin}%
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </InfoRow>
              <InfoRow label={t("Taxes")}>
                {product.taxes.length > 0 ? (
                  product.taxes.map((item) => (
                    <span key={item.id} className="badge bg-primary-100 p-3 rounded-full me-2">
                      {item.name} {item.rate}%
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                )}
              </InfoRow>
            </InfoCard>

            {/* Classification Card */}
            <InfoCard title={t("Classification")} icon={faLayerGroup}>
              {product.department && (
                <InfoRow label={t("Department")}>
                  <span className="badge bg-primary-100 p-3 rounded-full me-2">
                    {product.department.name}
                  </span>
                </InfoRow>
              )}
              <InfoRow label={t("Categories")}>
                {product.categories.length > 0 ? (
                  product.categories.map((item) => (
                    <span key={item.id} className="badge bg-primary-100 p-3 rounded-full me-2">
                      {item.name}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                )}
              </InfoRow>
              <InfoRow label={t("Brands")}>
                {product.brands.length > 0 ? (
                  product.brands.map((item) => (
                    <span key={item.id} className="badge bg-primary-100 p-3 rounded-full me-2">
                      {item.name}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                )}
              </InfoRow>
            </InfoCard>

            {/* Supply Chain Card */}
            <InfoCard title={t("Supply Chain")} icon={faTruck}>
              <InfoRow label={t("Suppliers")}>
                {product.suppliers.length > 0 ? (
                  product.suppliers.map((item) => (
                    <span key={item.id} className="badge bg-primary-100 p-3 rounded-full me-2">
                      {item.name}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                )}
              </InfoRow>
              <InfoRow label={t("Terminals")}>
                {product.terminals.length > 0 ? (
                  product.terminals.map((item) => (
                    <span key={item.id} className="badge bg-primary-100 p-3 rounded-full me-2">
                      {item.code}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-xs">—</span>
                )}
              </InfoRow>
            </InfoCard>
          </div>
        )}

        {/* ── Stock (was Stores) ─────────────────────────────────────── */}
        {activeTab === "stores" && (
          <div>
            {/* Total stock banner */}
            <div
              className="flex items-center gap-3 px-4 py-3 mb-4 rounded-lg"
              style={{
                background: "var(--pos-surface, #f8f9fb)",
                border: "1px solid var(--pos-border, #e5e7eb)",
              }}
            >
              <FontAwesomeIcon
                icon={faWarehouse}
                style={{ color: "var(--pos-accent, #2563eb)" }}
              />
              <span className="text-sm font-medium text-gray-700">
                {t("Total Stock")}:
              </span>
              <span
                className={`text-base font-bold tabular-nums ${
                  totalStock <= 0
                    ? "text-red-500"
                    : totalStock <= 10
                    ? "text-orange-500"
                    : "text-green-600"
                }`}
              >
                {totalStock.toLocaleString("fr-FR")}
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--pos-border, #e5e7eb)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-start" style={{ background: "var(--pos-surface, #f8f9fb)", borderBottom: "1px solid var(--pos-border, #e5e7eb)" }}>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {t("Store")}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {t("Stock")}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {t("Location")}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {t("Re Order Level")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {product.stores.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                        {t("No data available")}
                      </td>
                    </tr>
                  ) : (
                    product.stores.map((store) => {
                      const qty = Number(store.quantity ?? 0);
                      const rol = Number(store.reOrderLevel ?? 0);
                      return (
                        <tr
                          key={store.id}
                          className="transition-colors hover:bg-gray-50"
                          style={{ borderBottom: "1px solid var(--pos-border, #e5e7eb)" }}
                        >
                          <td className="px-4 py-3 font-medium text-gray-800 text-start">
                            {store.store.name}
                          </td>
                          <td className="px-4 py-3 text-start">
                            <StockBadge quantity={qty} reOrderLevel={rol} />
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-start">
                            {store.location ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-start">
                            {store.reOrderLevel ?? "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Variants ───────────────────────────────────────────────── */}
        {activeTab === "variants" && (
          <div>
            {product.variants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
                <FontAwesomeIcon icon={faLayerGroup} className="text-4xl" />
                <p className="text-sm">{t("No variants")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--pos-border, #e5e7eb)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--pos-surface, #f8f9fb)", borderBottom: "1px solid var(--pos-border, #e5e7eb)" }}>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {t("Name")}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {t("Barcode")}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {t("Price")}
                      </th>
                      <th className="px-4 py-3 text-start text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {t("Stock remaining")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((item) => (
                      <tr
                        key={item.id}
                        className="transition-colors hover:bg-gray-50"
                        style={{ borderBottom: "1px solid var(--pos-border, #e5e7eb)" }}
                      >
                        <td className="px-4 py-3 font-medium text-gray-800 text-start">
                          {item.name || item.attributeValue}
                        </td>
                        <td className="px-4 py-3 text-start">
                          <span className="font-mono text-xs text-gray-500">{item.barcode ?? "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-start font-medium text-gray-900">
                          {withCurrency(item.price)}
                        </td>
                        <td className="px-4 py-3 text-start">
                          <StockBadge quantity={Number(item.quantity ?? 0)} reOrderLevel={10} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Sales ──────────────────────────────────────────────────── */}
        {activeTab === "sales" && <ItemSales product={product} />}

        {/* ── Purchases ──────────────────────────────────────────────── */}
        {activeTab === "purchases" && <ItemPurchases product={product} />}
      </Modal>
    </>
  );
};

// ─── ItemSales ────────────────────────────────────────────────────────────────
interface ItemSaleProps {
  product: Product;
}
export const ItemSales = ({ product }: ItemSaleProps) => {
  const { t } = useTranslation();
  const useLoadHook = useApi<HydraCollection<OrderItemSimple>>(
    "order_products",
    `${ORDER_PRODUCTS_LIST}?product.id=${product["@id"]}`,
    {},
    "",
    "asc",
    1,
    1
  );

  const columnHelper = createColumnHelper<OrderItemSimple>();
  const columns: any[] = [
    columnHelper.accessor("order", {
      header: t("Order#"),
      cell: (info) => (
        <DynamicValue
          url={info.getValue()}
          cacheKey={info.getValue() || "order"}
          displayLoader={true}
          properties={["orderId"]}
        />
      ),
    }),
    columnHelper.accessor("variant", {
      header: t("Variant"),
      cell: (info) => (
        <DynamicValue
          url={info.getValue()}
          cacheKey={info.getValue() || "variant"}
          displayLoader={true}
          properties={["attributeValue"]}
        />
      ),
    }),
    columnHelper.accessor("createdAt", {
      header: t("Ordered at"),
      cell: (info) =>
        DateTime.fromISO(info.getValue()).toFormat(import.meta.env.VITE_DATE_TIME_FORMAT),
    }),
    columnHelper.accessor("quantity", {
      header: t("Quantity"),
    }),
    columnHelper.accessor("price", {
      header: t("Price"),
      cell: (info) => withCurrency(info.getValue()),
    }),
    columnHelper.accessor("discount", {
      header: t("Discount"),
      cell: (info) => withCurrency(info.getValue()),
    }),
    columnHelper.accessor("taxesTotal", {
      header: t("Taxes"),
      cell: (info) => withCurrency(info.getValue()),
      enableColumnFilter: false,
      enableSorting: false,
    }),
    columnHelper.accessor("id", {
      header: t("Total"),
      cell: (info) =>
        withCurrency(
          info.row.original.price * info.row.original.quantity -
            info.row.original.discount +
            info.row.original.taxesTotal
        ),
      enableColumnFilter: false,
      enableSorting: false,
    }),
  ];

  return (
    <TableComponent
      columns={columns}
      useLoadList={useLoadHook}
      loaderLineItems={7}
      loaderLines={10}
    />
  );
};

// ─── ItemPurchases ────────────────────────────────────────────────────────────
interface ItemPurchaseProps {
  product: Product;
}
export const ItemPurchases = ({ product }: ItemPurchaseProps) => {
  const { t } = useTranslation();
  const useLoadHook = useApi<HydraCollection<PurchaseItem>>(
    "purchase_products",
    `${PURCHASE_ITEM_LIST}?item.id=${product["@id"]}`,
    {},
    "",
    "asc",
    1,
    1
  );

  const columnHelper = createColumnHelper<PurchaseItem>();
  const columns: any[] = [
    columnHelper.accessor("purchase.@id", {
      id: "purchase.purchaseNumber",
      header: t("Purchase#"),
      cell: (info) => (
        <DynamicValue
          cacheKey={info.getValue() || "purchase_product"}
          url={info.getValue()}
          properties={["purchaseNumber"]}
          displayLoader={true}
        />
      ),
    }),
    columnHelper.accessor("quantityRequested", {
      header: t("Quantity Requested"),
    }),
    columnHelper.accessor("quantity", {
      header: t("Quantity"),
    }),
    columnHelper.accessor("purchasePrice", {
      header: t("Price"),
      cell: (info) => withCurrency(info.getValue()),
    }),
    columnHelper.accessor("id", {
      header: t("Total"),
      cell: (info) =>
        withCurrency(
          Number(info.row.original.purchasePrice) * Number(info.row.original.quantity)
        ),
      enableColumnFilter: false,
      enableSorting: false,
    }),
    columnHelper.accessor("createdAt", {
      header: t("Created at"),
      cell: (info) =>
        DateTime.fromISO(info.getValue()).toFormat(import.meta.env.VITE_DATE_TIME_FORMAT),
    }),
  ];

  return (
    <TableComponent
      columns={columns}
      useLoadList={useLoadHook}
      loaderLineItems={6}
      loaderLines={10}
    />
  );
};
