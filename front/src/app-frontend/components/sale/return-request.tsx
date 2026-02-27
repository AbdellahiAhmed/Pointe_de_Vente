import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCheck,
  faSearch,
  faSpinner,
  faUndo,
} from "@fortawesome/free-solid-svg-icons";
import { fetchJson, jsonRequest } from "../../../api/request/request";
import {
  ORDER_LIST,
  RETURN_REQUEST_CREATE,
} from "../../../api/routing/routes/backend.app";
import { notify } from "../../../app-common/components/confirm/notification";
import { withCurrency } from "../../../lib/currency/currency";
import { DateTime } from "luxon";
import { Shortcut } from "../../../app-common/components/input/shortcut";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderItemResponse {
  "@id": string;
  id: number;
  product: { id: number; name: string; barcode: string };
  quantity: number;
  price: number;
  variant?: { attributeValue: string };
  isReturned?: boolean;
}

interface OrderResponse {
  "@id": string;
  id: number;
  orderId: string;
  status?: string;
  items: OrderItemResponse[];
  createdAt: string;
  customer?: { name: string };
}

interface ReturnLineState {
  included: boolean;
  quantity: number;
  reason: string;
}

type Step = "search" | "select" | "confirm" | "success";

export interface ReturnRequestProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const displayName = (item: OrderItemResponse): string =>
  item.variant
    ? `${item.product.name} (${item.variant.attributeValue})`
    : item.product.name;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ReturnRequest: FC<ReturnRequestProps> = ({ open, onClose, onSuccess }) => {
  const { t } = useTranslation();

  // ---- step state ----
  const [step, setStep] = useState<Step>("search");

  // ---- search ----
  const [searchValue, setSearchValue] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ---- order ----
  const [order, setOrder] = useState<OrderResponse | null>(null);

  // ---- line items keyed by orderItem id ----
  const [lines, setLines] = useState<Record<number, ReturnLineState>>({});

  // ---- overall reason ----
  const [overallReason, setOverallReason] = useState("");

  // ---- submit ----
  const [submitting, setSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // Reset everything when the modal is opened/closed
  // ---------------------------------------------------------------------------

  const resetAll = useCallback(() => {
    setStep("search");
    setSearchValue("");
    setSearchError(null);
    setOrder(null);
    setLines({});
    setOverallReason("");
    setSubmitting(false);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (open) {
      resetAll();
      // Focus the search input on next tick after reset
      setTimeout(() => searchInputRef.current?.focus(), 60);
    }
  }, [open, resetAll]);

  // ---------------------------------------------------------------------------
  // Step 1 – Search
  // ---------------------------------------------------------------------------

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = searchValue.trim();
    if (!raw) return;

    setSearching(true);
    setSearchError(null);

    try {
      const params = new URLSearchParams({ orderId: raw, status: "Completed" });
      const json = await fetchJson(`${ORDER_LIST}?${params.toString()}`);

      // Support both hydra (API Platform) and custom list wrapper
      const members: OrderResponse[] =
        json?.["hydra:member"] ?? json?.list ?? [];

      if (members.length === 0) {
        setSearchError(t("No order found for {{id}}", { id: raw }));
        return;
      }

      // Find exact match by orderId (API may return multiple results)
      const found = members.find((o) => String(o.orderId) === raw) ?? members[0];

      if (String(found.orderId) !== raw) {
        setSearchError(t("No order found for {{id}}", { id: raw }));
        return;
      }

      const returnable = found.items.filter((i) => !i.isReturned);

      if (returnable.length === 0) {
        setSearchError(
          t("All items in this order have already been returned.")
        );
        return;
      }

      // Initialise line state – nothing selected, full quantity pre-filled
      const initial: Record<number, ReturnLineState> = {};
      for (const item of returnable) {
        initial[item.id] = {
          included: false,
          quantity: item.quantity,
          reason: "",
        };
      }

      setOrder(found);
      setLines(initial);
      setStep("select");
    } catch {
      setSearchError(t("An error occurred while searching. Please try again."));
    } finally {
      setSearching(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 2 – Select items
  // ---------------------------------------------------------------------------

  const toggleIncluded = (id: number) => {
    setLines((prev) => ({
      ...prev,
      [id]: { ...prev[id], included: !prev[id].included },
    }));
  };

  const allSelected = returnableItems.length > 0 &&
    returnableItems.every((item) => lines[item.id]?.included);
  const someSelected = returnableItems.some((item) => lines[item.id]?.included) && !allSelected;

  const toggleAll = () => {
    const newValue = !allSelected;
    setLines((prev) => {
      const updated = { ...prev };
      for (const item of returnableItems) {
        updated[item.id] = { ...updated[item.id], included: newValue };
      }
      return updated;
    });
  };

  const setLineQty = (id: number, raw: string, max: number) => {
    const parsed = parseInt(raw, 10);
    const clamped = isNaN(parsed) ? 1 : Math.min(Math.max(1, parsed), max);
    setLines((prev) => ({ ...prev, [id]: { ...prev[id], quantity: clamped } }));
  };

  const setLineReason = (id: number, value: string) => {
    setLines((prev) => ({ ...prev, [id]: { ...prev[id], reason: value } }));
  };

  const includedItems = order
    ? order.items
        .filter((i) => !i.isReturned && lines[i.id]?.included)
    : [];

  const canProceedToConfirm = includedItems.length > 0;

  // ---------------------------------------------------------------------------
  // Step 3 – Confirm & Submit
  // ---------------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!order || includedItems.length === 0) return;

    setSubmitting(true);
    try {
      const payload = {
        orderId: order.id,
        reason: overallReason.trim() || undefined,
        items: includedItems.map((item) => ({
          orderProductId: item.id,
          quantity: lines[item.id].quantity,
          reason: lines[item.id].reason.trim() || undefined,
        })),
      };

      const response = await jsonRequest(RETURN_REQUEST_CREATE, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const msg =
          body?.["hydra:description"] ??
          body?.errorMessage ??
          t("Failed to submit return request.");
        notify({ type: "error", description: msg });
        return;
      }

      setStep("success");
      onSuccess?.();
    } catch {
      notify({
        type: "error",
        description: t("An error occurred while submitting. Please try again."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Early exit when closed
  // ---------------------------------------------------------------------------

  if (!open) return null;

  // ---------------------------------------------------------------------------
  // Returnables (non-returned items) for the order
  // ---------------------------------------------------------------------------

  const returnableItems = order
    ? order.items.filter((i) => !i.isReturned)
    : [];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      <Shortcut actionId="close_modal" handler={onClose} />

      <div className="pos-modal-overlay" role="dialog" aria-modal="true">
        <div className="pos-modal" style={{ maxWidth: 700, width: "100%" }}>

          {/* ---------------------------------------------------------------- */}
          {/* Header                                                            */}
          {/* ---------------------------------------------------------------- */}
          <div className="pos-modal__header">
            <h3
              style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}
            >
              <FontAwesomeIcon icon={faUndo} />
              {t("Return Request")}
              {order && step !== "success" && (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 400,
                    color: "var(--pos-text-muted, #6b7280)",
                    marginInlineStart: 8,
                  }}
                >
                  {t("Order#")} {order.orderId}
                </span>
              )}
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("Close")}
              style={{ fontSize: 22, lineHeight: 1 }}
            >
              &times;
            </button>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Step indicator                                                    */}
          {/* ---------------------------------------------------------------- */}
          {step !== "success" && (
            <div
              style={{
                display: "flex",
                gap: 4,
                padding: "10px 16px",
                background: "var(--pos-bg-subtle, #f9fafb)",
                borderBottom: "1px solid var(--pos-border, #e5e7eb)",
              }}
            >
              {(["search", "select", "confirm"] as const).map((s, idx) => {
                const labels: Record<typeof s, string> = {
                  search: t("1. Find Order"),
                  select: t("2. Select Items"),
                  confirm: t("3. Confirm"),
                };
                const isActive = step === s;
                const isDone =
                  (s === "search" && (step === "select" || step === "confirm")) ||
                  (s === "select" && step === "confirm");
                return (
                  <span
                    key={s}
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? 700 : 400,
                      color: isActive
                        ? "var(--pos-primary, #2563eb)"
                        : isDone
                        ? "var(--pos-success, #16a34a)"
                        : "var(--pos-text-muted, #9ca3af)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {isDone && <FontAwesomeIcon icon={faCheck} size="xs" />}
                    {labels[s]}
                    {idx < 2 && (
                      <span style={{ marginInline: 4, color: "#d1d5db" }}>›</span>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 1 – SEARCH                                                  */}
          {/* ================================================================ */}
          {step === "search" && (
            <form onSubmit={handleSearch}>
              <div className="pos-modal__body">
                <p style={{ marginBottom: 16, color: "var(--pos-text-muted, #6b7280)", fontSize: 14 }}>
                  {t("Enter the order number to search for a previous order.")}
                </p>
                <div className="input-group">
                  <input
                    ref={searchInputRef}
                    type="text"
                    className="pos-modal__input"
                    placeholder={t("Order number")}
                    value={searchValue}
                    onChange={(e) => {
                      setSearchValue(e.target.value);
                      setSearchError(null);
                    }}
                    style={{ flex: 1 }}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={searching || !searchValue.trim()}
                    style={{ minWidth: 110 }}
                  >
                    {searching ? (
                      <FontAwesomeIcon icon={faSpinner} spin />
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faSearch} className="me-2" />
                        {t("Search")}
                      </>
                    )}
                  </button>
                </div>

                {searchError && (
                  <div
                    role="alert"
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      color: "#991b1b",
                      fontSize: 13,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>⚠</span>
                    {searchError}
                  </div>
                )}
              </div>

              <div className="pos-modal__footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onClose}
                >
                  {t("Cancel")}
                </button>
              </div>
            </form>
          )}

          {/* ================================================================ */}
          {/* STEP 2 – SELECT ITEMS                                             */}
          {/* ================================================================ */}
          {step === "select" && order && (
            <div>
              <div className="pos-modal__body" style={{ padding: "12px 16px" }}>
                {/* Order meta */}
                <div
                  style={{
                    display: "flex",
                    gap: 24,
                    marginBottom: 16,
                    flexWrap: "wrap",
                    fontSize: 13,
                    color: "var(--pos-text-muted, #6b7280)",
                  }}
                >
                  {order.customer?.name && (
                    <span>
                      <strong>{t("Customer")}:</strong> {order.customer.name}
                    </span>
                  )}
                  <span>
                    <strong>{t("Date")}:</strong>{" "}
                    {DateTime.fromISO(order.createdAt).toFormat(
                      (import.meta.env.VITE_DATE_TIME_FORMAT as string) ||
                        "dd/MM/yyyy HH:mm"
                    )}
                  </span>
                  <span>
                    <strong>{t("Items")}:</strong> {returnableItems.length}
                  </span>
                </div>

                {/* Items table */}
                <div style={{ overflowX: "auto" }}>
                  <table className="table border border-collapse" style={{ width: "100%", minWidth: 520 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 36, textAlign: "center", verticalAlign: "middle" }}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            style={{ width: 18, height: 18, cursor: "pointer" }}
                            checked={allSelected}
                            ref={(el) => { if (el) el.indeterminate = someSelected; }}
                            onChange={toggleAll}
                            title={t("Select all")}
                          />
                        </th>
                        <th className="text-start">{t("Product")}</th>
                        <th className="text-end" style={{ width: 90 }}>
                          {t("Price")}
                        </th>
                        <th className="text-center" style={{ width: 80 }}>
                          {t("Orig. Qty")}
                        </th>
                        <th className="text-center" style={{ width: 100 }}>
                          {t("Return Qty")}
                        </th>
                        <th className="text-start" style={{ minWidth: 140 }}>
                          {t("Reason (optional)")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnableItems.map((item) => {
                        const line = lines[item.id];
                        return (
                          <tr
                            key={item.id}
                            className={line.included ? "bg-primary-50" : "hover:bg-gray-100"}
                            style={{
                              transition: "background 0.15s",
                            }}
                          >
                            {/* Checkbox */}
                            <td
                              style={{ textAlign: "center", verticalAlign: "middle" }}
                            >
                              <input
                                type="checkbox"
                                className="form-check-input"
                                style={{ width: 18, height: 18, cursor: "pointer" }}
                                checked={line.included}
                                onChange={() => toggleIncluded(item.id)}
                                id={`chk-${item.id}`}
                              />
                            </td>

                            {/* Product name */}
                            <td
                              style={{ verticalAlign: "middle" }}
                            >
                              <label
                                htmlFor={`chk-${item.id}`}
                                style={{ cursor: "pointer", fontWeight: line.included ? 600 : 400 }}
                              >
                                {displayName(item)}
                              </label>
                            </td>

                            {/* Price */}
                            <td
                              className="text-end"
                              style={{ verticalAlign: "middle" }}
                            >
                              {withCurrency(item.price)}
                            </td>

                            {/* Original qty */}
                            <td
                              className="text-center"
                              style={{ verticalAlign: "middle", color: "var(--pos-text-muted, #6b7280)" }}
                            >
                              {item.quantity}
                            </td>

                            {/* Return qty */}
                            <td
                              className="text-center"
                              style={{ verticalAlign: "middle" }}
                            >
                              <input
                                type="number"
                                className="pos-modal__input"
                                style={{ width: 72, textAlign: "center", padding: "4px 6px" }}
                                min={1}
                                max={item.quantity}
                                value={line.quantity}
                                disabled={!line.included}
                                onChange={(e) =>
                                  setLineQty(item.id, e.target.value, item.quantity)
                                }
                              />
                            </td>

                            {/* Per-item reason */}
                            <td style={{ verticalAlign: "middle" }}>
                              <input
                                type="text"
                                className="pos-modal__input"
                                style={{ width: "100%", padding: "4px 8px" }}
                                placeholder={t("Optional reason")}
                                disabled={!line.included}
                                value={line.reason}
                                onChange={(e) =>
                                  setLineReason(item.id, e.target.value)
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Overall reason */}
                <div style={{ marginTop: 16 }}>
                  <label
                    style={{ display: "block", fontWeight: 500, marginBottom: 6, fontSize: 14 }}
                    htmlFor="overall-reason"
                  >
                    {t("Overall return reason (optional)")}
                  </label>
                  <textarea
                    id="overall-reason"
                    className="pos-modal__input"
                    style={{ width: "100%", minHeight: 72, resize: "vertical", padding: 8 }}
                    placeholder={t("e.g. Customer changed mind, defective product…")}
                    value={overallReason}
                    onChange={(e) => setOverallReason(e.target.value)}
                    rows={3}
                  />
                </div>

                {!canProceedToConfirm && (
                  <div
                    role="alert"
                    style={{
                      marginTop: 12,
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "#fffbeb",
                      border: "1px solid #fde68a",
                      color: "#92400e",
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {t("Select at least one item to return.")}
                  </div>
                )}
              </div>

              <div className="pos-modal__footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setOrder(null);
                    setStep("search");
                  }}
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                  {t("Back")}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!canProceedToConfirm}
                  onClick={() => setStep("confirm")}
                >
                  {t("Review Return")}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 3 – CONFIRM                                                 */}
          {/* ================================================================ */}
          {step === "confirm" && order && (
            <div>
              <div className="pos-modal__body" style={{ padding: "12px 16px" }}>
                <p style={{ marginBottom: 16, fontSize: 14 }}>
                  {t("Please review the return details below before submitting.")}
                </p>

                <table className="table border border-collapse" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th className="text-start">{t("Product")}</th>
                      <th className="text-end" style={{ width: 90 }}>
                        {t("Unit Price")}
                      </th>
                      <th className="text-center" style={{ width: 80 }}>
                        {t("Qty")}
                      </th>
                      <th className="text-end" style={{ width: 110 }}>
                        {t("Subtotal")}
                      </th>
                      <th className="text-start">{t("Reason")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {includedItems.map((item) => {
                      const line = lines[item.id];
                      return (
                        <tr key={item.id}>
                          <td>{displayName(item)}</td>
                          <td className="text-end">{withCurrency(item.price)}</td>
                          <td className="text-center">{line.quantity}</td>
                          <td className="text-end">
                            {withCurrency(item.price * line.quantity)}
                          </td>
                          <td
                            style={{
                              color: line.reason
                                ? "inherit"
                                : "var(--pos-text-muted, #9ca3af)",
                              fontSize: 13,
                            }}
                          >
                            {line.reason || t("—")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <th className="text-start" colSpan={3}>
                        {t("Total return value")}
                      </th>
                      <th className="text-end text-danger-600">
                        {withCurrency(
                          includedItems.reduce(
                            (sum, item) => sum + item.price * lines[item.id].quantity,
                            0
                          )
                        )}
                      </th>
                      <th></th>
                    </tr>
                  </tfoot>
                </table>

                {overallReason && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: "10px 14px",
                      background: "var(--pos-bg-subtle, #f9fafb)",
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  >
                    <strong>{t("Overall reason")}:</strong> {overallReason}
                  </div>
                )}

                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    color: "#1e40af",
                    fontSize: 13,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 16 }}>ℹ</span>
                  {t(
                    "This request will be sent to a manager for approval. The return will not be processed until it is approved."
                  )}
                </div>
              </div>

              <div className="pos-modal__footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting}
                  onClick={() => setStep("select")}
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
                  {t("Back")}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                      {t("Submitting…")}
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheck} className="me-2" />
                      {t("Submit Return Request")}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* STEP 4 – SUCCESS                                                 */}
          {/* ================================================================ */}
          {step === "success" && (
            <div>
              <div
                className="pos-modal__body"
                style={{ textAlign: "center", padding: "40px 24px" }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "var(--pos-success-bg, #dcfce7)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 20px",
                  }}
                >
                  <FontAwesomeIcon
                    icon={faCheck}
                    size="2x"
                    style={{ color: "var(--pos-success, #16a34a)" }}
                  />
                </div>

                <h4 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
                  {t("Return Request Submitted")}
                </h4>
                <p
                  style={{
                    color: "var(--pos-text-muted, #6b7280)",
                    fontSize: 14,
                    maxWidth: 380,
                    margin: "0 auto 24px",
                  }}
                >
                  {t(
                    "Your return request has been submitted and is awaiting manager approval."
                  )}
                </p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onClose}
                >
                  {t("Close")}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};
