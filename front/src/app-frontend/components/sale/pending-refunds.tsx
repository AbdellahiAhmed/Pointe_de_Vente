import React, { FC, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMoneyBillWave,
  faSpinner,
  faCheck,
} from "@fortawesome/free-solid-svg-icons";
import { fetchJson, jsonRequest } from "../../../api/request/request";
import {
  RETURN_REQUEST_LIST,
  RETURN_REQUEST_PROCESS_REFUND,
  PAYMENT_TYPE_LIST,
} from "../../../api/routing/routes/backend.app";
import { notify } from "../../../app-common/components/confirm/notification";
import { withCurrency } from "../../../lib/currency/currency";
import { Shortcut } from "../../../app-common/components/input/shortcut";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReturnItemOrderProduct {
  product: { name: string } | null;
  quantity: number;
  price: number;
}

interface ReturnItem {
  id: number;
  orderProduct: ReturnItemOrderProduct;
  quantity: number;
  reason: string | null;
}

interface ReturnOrder {
  id: number;
  orderId: string;
}

interface ReturnUser {
  id: number;
  displayName: string;
}

interface ApprovedReturn {
  id: number;
  order: ReturnOrder;
  requestedBy: ReturnUser;
  reason: string;
  items: ReturnItem[];
  createdAt: string;
}

interface PaymentType {
  id: number;
  name: string;
}

export interface PendingRefundsProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PendingRefunds: FC<PendingRefundsProps> = ({ open, onClose }) => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [returns, setReturns] = useState<ApprovedReturn[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [processing, setProcessing] = useState(false);

  // Selected return for refund processing
  const [selectedReturn, setSelectedReturn] = useState<ApprovedReturn | null>(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState<number | "">("");

  // ---------------------------------------------------------------------------
  // Fetch data
  // ---------------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [returnsRes, paymentsRes] = await Promise.all([
        jsonRequest(`${RETURN_REQUEST_LIST}?status=APPROVED`),
        jsonRequest(PAYMENT_TYPE_LIST),
      ]);

      const returnsJson = await returnsRes.json();
      const paymentsJson = await paymentsRes.json();

      const list = Array.isArray(returnsJson) ? returnsJson : (returnsJson?.list ?? []);
      setReturns(list);

      const members = paymentsJson?.["hydra:member"] ?? paymentsJson ?? [];
      setPaymentTypes(
        members
          .filter((pt: any) => pt.isActive !== false)
          .map((pt: any) => ({ id: pt.id, name: pt.name }))
      );
    } catch {
      notify({ type: "error", description: t("Failed to load pending refunds.") });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (open) {
      fetchData();
      setSelectedReturn(null);
      setSelectedPaymentType("");
    }
  }, [open, fetchData]);

  // ---------------------------------------------------------------------------
  // Process refund
  // ---------------------------------------------------------------------------

  const handleProcessRefund = async () => {
    if (!selectedReturn || selectedPaymentType === "") return;

    setProcessing(true);
    try {
      const url = RETURN_REQUEST_PROCESS_REFUND.replace(":id", String(selectedReturn.id));
      const response = await jsonRequest(url, {
        method: "PUT",
        body: JSON.stringify({ paymentTypeId: Number(selectedPaymentType) }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        const msg = body?.errorMessage ?? body?.message ?? t("Failed to process refund.");
        notify({ type: "error", description: msg });
        return;
      }

      const result = await response.json();
      const methodName = result?.paymentMethod ?? "";

      notify({
        type: "success",
        description: `${t("Refund processed successfully")} — ${withCurrency(result?.refundTotal ?? 0)} ${methodName ? `(${methodName})` : ""}`,
      });

      // Refresh the list
      setSelectedReturn(null);
      setSelectedPaymentType("");
      await fetchData();
    } catch {
      notify({ type: "error", description: t("An error occurred while processing the refund.") });
    } finally {
      setProcessing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const getRefundTotal = (items: ReturnItem[]) =>
    items.reduce((sum, item) => sum + (item.orderProduct?.price ?? 0) * item.quantity, 0);

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      }).format(new Date(iso));
    } catch { return iso; }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (!open) return null;

  return (
    <>
      <Shortcut actionId="close_modal" handler={onClose} />

      <div className="pos-modal-overlay" role="dialog" aria-modal="true">
        <div className="pos-modal" style={{ maxWidth: 600, width: "100%" }}>

          {/* Header */}
          <div className="pos-modal__header">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
              <FontAwesomeIcon icon={faMoneyBillWave} />
              {t("Pending Refunds")}
              {returns.length > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    borderRadius: 12,
                    padding: "2px 8px",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {returns.length}
                </span>
              )}
            </h3>
            <button type="button" onClick={onClose} aria-label={t("Close")} style={{ fontSize: 22, lineHeight: 1 }}>
              &times;
            </button>
          </div>

          {/* Body */}
          <div className="pos-modal__body" style={{ padding: "16px 20px", maxHeight: "60vh", overflowY: "auto" }}>
            {loading && (
              <div style={{ textAlign: "center", padding: 32 }}>
                <FontAwesomeIcon icon={faSpinner} spin size="2x" style={{ color: "#6b7280" }} />
              </div>
            )}

            {!loading && returns.length === 0 && (
              <div style={{ textAlign: "center", padding: 32, color: "#6b7280" }}>
                <FontAwesomeIcon icon={faCheck} size="2x" style={{ marginBottom: 12, color: "#22c55e" }} />
                <p style={{ fontSize: 15, fontWeight: 600 }}>{t("No pending refunds")}</p>
                <p style={{ fontSize: 13 }}>{t("All approved returns have been refunded.")}</p>
              </div>
            )}

            {!loading && returns.length > 0 && !selectedReturn && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {returns.map((ret) => (
                  <div
                    key={ret.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "12px 16px",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      background: "#fff",
                    }}
                    className="hover:bg-gray-50"
                    onClick={() => setSelectedReturn(ret)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>
                        {t("Order #")}{ret.order.orderId}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 16,
                          color: "#ef4444",
                        }}
                      >
                        {withCurrency(getRefundTotal(ret.items))}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#6b7280" }}>
                      <span>{formatDate(ret.createdAt)}</span>
                      <span>{ret.requestedBy.displayName}</span>
                      <span>{ret.items.length} {t("item(s)")}</span>
                    </div>
                    {ret.reason && (
                      <div style={{ marginTop: 4, fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>
                        {ret.reason}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Selected return - Process Refund */}
            {!loading && selectedReturn && (
              <div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
                      {t("Order #")}{selectedReturn.order.orderId}
                    </h4>
                    <span style={{ fontWeight: 700, fontSize: 20, color: "#ef4444" }}>
                      {withCurrency(getRefundTotal(selectedReturn.items))}
                    </span>
                  </div>

                  {/* Items list */}
                  <table className="table border border-collapse" style={{ width: "100%", fontSize: 13 }}>
                    <thead>
                      <tr>
                        <th className="text-start">{t("Product")}</th>
                        <th className="text-center" style={{ width: 60 }}>{t("Qty")}</th>
                        <th className="text-end" style={{ width: 100 }}>{t("Total")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReturn.items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.orderProduct?.product?.name ?? "—"}</td>
                          <td className="text-center">{item.quantity}</td>
                          <td className="text-end text-danger-500 font-bold">
                            {withCurrency((item.orderProduct?.price ?? 0) * item.quantity)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Payment method selector */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
                    {t("Refund payment method")}
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                    {paymentTypes.map((pt) => (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => setSelectedPaymentType(pt.id)}
                        style={{
                          padding: "12px 8px",
                          borderRadius: 10,
                          border: selectedPaymentType === pt.id ? "2px solid #2563eb" : "1px solid #d1d5db",
                          background: selectedPaymentType === pt.id ? "#eff6ff" : "#fff",
                          color: selectedPaymentType === pt.id ? "#1d4ed8" : "#374151",
                          fontWeight: selectedPaymentType === pt.id ? 700 : 500,
                          fontSize: 14,
                          cursor: "pointer",
                          transition: "all 0.15s",
                          textAlign: "center",
                        }}
                      >
                        {pt.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pos-modal__footer">
            {selectedReturn ? (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedReturn(null);
                    setSelectedPaymentType("");
                  }}
                  disabled={processing}
                >
                  {t("Back")}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={processing || selectedPaymentType === ""}
                  onClick={handleProcessRefund}
                  style={{
                    background: selectedPaymentType !== "" ? "#16a34a" : undefined,
                    borderColor: selectedPaymentType !== "" ? "#16a34a" : undefined,
                  }}
                >
                  {processing ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                      {t("Processing...")}
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faMoneyBillWave} className="me-2" />
                      {t("Process Refund")} — {withCurrency(selectedReturn ? getRefundTotal(selectedReturn.items) : 0)}
                    </>
                  )}
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                {t("Close")}
              </button>
            )}
          </div>

        </div>
      </div>
    </>
  );
};
