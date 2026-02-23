import React, { FC, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faBoxOpen,
  faExclamationTriangle,
  faMagnifyingGlass,
  faSpinner,
  faSyncAlt,
} from "@fortawesome/free-solid-svg-icons";
import { jsonRequest } from "../../../api/request/request";
import { STOCK_ALERTS } from "../../../api/routing/routes/backend.app";
import { getStore } from "../../../duck/store/store.selector";

interface StockAlertItem {
  productId: number;
  productName: string;
  barcode: string | null;
  storeId: number;
  storeName: string;
  quantity: number;
  reOrderLevel: number;
}

export const StockAlerts: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const store = useSelector(getStore);
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = useQuery(
    ["stock-alerts-page", store?.id],
    async () => {
      const res = await jsonRequest(STOCK_ALERTS + "?store=" + store?.id);
      return res.json();
    },
    {
      enabled: !!store?.id,
      refetchOnWindowFocus: false,
    }
  );

  const items: StockAlertItem[] = data?.list ?? [];

  // Filter by search
  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) =>
        i.productName.toLowerCase().includes(q) ||
        (i.barcode && i.barcode.includes(q))
    );
  }, [items, search]);

  // Summary
  const outOfStock = items.filter((i) => i.quantity <= 0).length;
  const lowStock = items.filter((i) => i.quantity > 0).length;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/pos")}
          className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          title={t("Back")}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-gray-600 text-lg" />
        </button>
        <div className="p-2.5 bg-amber-100 rounded-lg">
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            className="text-amber-600 text-lg"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {t("Low Stock Alerts")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("Products below reorder level")}
          </p>
        </div>
        <div className="ms-auto">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FontAwesomeIcon icon={isLoading ? faSpinner : faSyncAlt} spin={isLoading} />
            {t("Refresh")}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total alerts */}
        <div className="rounded-xl shadow-sm p-4 flex items-center gap-4 border-s-4 border-amber-400 bg-amber-50">
          <div className="text-2xl text-amber-500">
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t("Total alerts")}
            </p>
            <p className="text-xl font-bold mt-0.5 text-amber-700">
              {items.length}
            </p>
          </div>
        </div>

        {/* Out of stock */}
        <div className="rounded-xl shadow-sm p-4 flex items-center gap-4 border-s-4 border-red-400 bg-red-50">
          <div className="text-2xl text-red-500">
            <FontAwesomeIcon icon={faBoxOpen} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t("Out of stock")}
            </p>
            <p className="text-xl font-bold mt-0.5 text-red-700">
              {outOfStock}
            </p>
          </div>
        </div>

        {/* Low stock */}
        <div className="rounded-xl shadow-sm p-4 flex items-center gap-4 border-s-4 border-orange-400 bg-orange-50">
          <div className="text-2xl text-orange-500">
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t("Low Stock")}
            </p>
            <p className="text-xl font-bold mt-0.5 text-orange-700">
              {lowStock}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-lg">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search by product name or barcode...")}
            className="input w-full ps-9 pe-4"
            autoComplete="off"
          />
        </div>
        {search && (
          <span className="text-sm text-gray-500">
            {filtered.length} {t("results")}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <FontAwesomeIcon icon={faSpinner} spin className="me-3 text-xl" />
            {t("Loading...")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="text-start px-4 py-3 font-semibold">
                    {t("Product")}
                  </th>
                  <th className="text-start px-4 py-3 font-semibold">
                    {t("Barcode")}
                  </th>
                  <th className="text-start px-4 py-3 font-semibold">
                    {t("Current stock")}
                  </th>
                  <th className="text-start px-4 py-3 font-semibold">
                    {t("Reorder level")}
                  </th>
                  <th className="text-start px-4 py-3 font-semibold">
                    {t("Status")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-gray-400">
                      <FontAwesomeIcon
                        icon={faBoxOpen}
                        className="text-3xl mb-2 block mx-auto"
                      />
                      {search
                        ? t("No products match your search")
                        : t("No stock alerts")}
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const isOut = item.quantity <= 0;
                    return (
                      <tr
                        key={`${item.productId}-${item.storeId}`}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {item.productName}
                        </td>
                        <td className="px-4 py-3 text-gray-500" dir="ltr">
                          {item.barcode || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-bold ${
                              isOut ? "text-red-600" : "text-amber-600"
                            }`}
                          >
                            {Number(item.quantity).toFixed(0)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {Number(item.reOrderLevel).toFixed(0)}
                        </td>
                        <td className="px-4 py-3">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                              {t("Out of stock")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                              {t("Low Stock")}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
