import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCheckCircle,
  faChevronDown,
  faChevronUp,
  faCreditCard,
  faHistory,
  faMagnifyingGlass,
  faMoneyBillWave,
  faSpinner,
  faUsers,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { DateTime } from "luxon";
import { fetchJson, jsonRequest } from "../../../api/request/request";
import {
  CUSTOMER_PAYMENT_CREATE,
  REPORT_CUSTOMERS,
  PAYMENT_TYPE_LIST,
} from "../../../api/routing/routes/backend.app";
import { Customer } from "../../../api/model/customer";
import { CustomerPayment } from "../../../api/model/customer.payment";
import { PaymentType } from "../../../api/model/payment.type";
import { withCurrency } from "../../../lib/currency/currency";
import { notify } from "../../../app-common/components/confirm/notification";
import {
  HttpException,
} from "../../../lib/http/exception/http.exception";
import { Button } from "../../../app-common/components/input/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportCustomerItem extends Customer {
  totalCollected?: number;
}

interface ReportResponse {
  customers: ReportCustomerItem[];
  totalOutstanding: number;
  totalCustomers: number;
  creditCustomers: number;
  totalCollected: number;
}

// ---------------------------------------------------------------------------
// Helper: safe DateTime parsing (handles ISO 8601 and raw SQL formats)
// ---------------------------------------------------------------------------

function parseDate(raw: string | undefined | null): DateTime {
  if (!raw) return DateTime.now();
  const dt = DateTime.fromISO(raw);
  if (dt.isValid) return dt;
  return DateTime.fromSQL(raw);
}

// ---------------------------------------------------------------------------
// Sub-component: PaymentHistory row-group
// ---------------------------------------------------------------------------

interface PaymentHistoryProps {
  payments: CustomerPayment[];
}

const PaymentHistory: FC<PaymentHistoryProps> = ({ payments }) => {
  const { t } = useTranslation();

  const sorted = useMemo(
    () =>
      [...payments].sort((a, b) => {
        const da = parseDate(a.createdAt).toMillis();
        const db = parseDate(b.createdAt).toMillis();
        return db - da;
      }),
    [payments]
  );

  if (sorted.length === 0) {
    return (
      <tr>
        <td colSpan={4} className="py-3 text-center text-sm text-gray-400 italic">
          {t("No payment history")}
        </td>
      </tr>
    );
  }

  return (
    <>
      {sorted.map((p) => (
        <tr key={p.id} className="bg-gray-50 border-b border-gray-100 last:border-0">
          <td className="ps-10 py-2 text-xs text-gray-500 w-40">
            <span dir="ltr" className="inline-block">
              {parseDate(p.createdAt).toFormat("dd/MM/yyyy HH:mm")}
            </span>
          </td>
          <td className="py-2 text-sm font-semibold text-green-700">
            {withCurrency(p.amount)}
          </td>
          <td className="py-2 text-sm text-gray-500">
            {p.paymentType?.name ?? "-"}
          </td>
          <td className="py-2 pe-4 text-sm text-gray-600">{p.description}</td>
        </tr>
      ))}
    </>
  );
};

// ---------------------------------------------------------------------------
// Sub-component: Inline payment form
// ---------------------------------------------------------------------------

interface InlinePaymentFormProps {
  customer: ReportCustomerItem;
  onSuccess: (customerId: number | string, newPayment: CustomerPayment, paidAmount: number) => void;
  onCancel: () => void;
}

const InlinePaymentForm: FC<InlinePaymentFormProps> = ({
  customer,
  onSuccess,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form state (no yupResolver — manual validation to avoid version conflict)
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState("");
  const [description, setDescription] = useState<string>(String(t("Debt payment")));

  useEffect(() => {
    (async () => {
      try {
        const res = await jsonRequest(PAYMENT_TYPE_LIST);
        const json = await res.json();
        const list: PaymentType[] = json["hydra:member"] ?? [];
        setPaymentTypes(list.filter((p) => p.isActive && p.category !== 'credit'));
      } catch {}
    })();
  }, []);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const n = parseFloat(amount);
    if (!amount.trim() || isNaN(n) || n <= 0) {
      errs.amount = t("Amount must be greater than 0");
    }
    if (!paymentType) {
      errs.paymentType = t("Payment type is required");
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const iri = customer["@id"] ?? `/api/customers/${customer.id}`;
      const body: Record<string, any> = {
        customer: iri,
        amount: amount,
        description: description || t("Debt payment"),
      };

      if (paymentType) {
        body.paymentType = `/api/payments/${paymentType}`;
      }

      const response: CustomerPayment = await fetchJson(CUSTOMER_PAYMENT_CREATE, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!response.createdAt) {
        response.createdAt = new Date().toISOString();
      }

      if (!response.paymentType && paymentType) {
        const pt = paymentTypes.find((p) => String(p.id) === paymentType);
        if (pt) {
          response.paymentType = { id: Number(pt.id), name: pt.name };
        }
      }

      const paidAmount = parseFloat(amount) || 0;

      notify({
        type: "success",
        description: `${t("Payment recorded successfully")} — ${withCurrency(paidAmount)}`,
      });

      setAmount("");
      setPaymentType("");
      setDescription(String(t("Debt payment")));
      setFormErrors({});
      onSuccess(customer.id, response, paidAmount);
    } catch (exception: any) {
      const err = exception as any;
      if (err?.code === 403 || err?.response?.status === 403) {
        notify({ type: "error", description: t("You do not have permission to record payments") });
      } else {
        notify({ type: "error", description: t("Failed to save payment") });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {t("Record payment for")} {customer.name}
        </span>
        <span className="text-xs text-amber-600 font-bold">
          ({t("Outstanding")}: {withCurrency(customer.outstanding)})
        </span>
      </div>
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        {/* Amount */}
        <div className="flex flex-col min-w-[140px]">
          <label className="text-xs font-medium text-gray-600 mb-1">
            {t("Amount")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={String(customer.outstanding)}
            className={`input w-full ${formErrors.amount ? 'error' : ''}`}
            autoFocus
          />
          {formErrors.amount && (
            <div className="text-danger-500 text-sm">{formErrors.amount}</div>
          )}
        </div>

        {/* Payment Type */}
        <div className="flex flex-col min-w-[160px]">
          <label className="text-xs font-medium text-gray-600 mb-1">
            {t("Payment type")} <span className="text-red-500">*</span>
          </label>
          <select
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value)}
            className={`input w-full ${formErrors.paymentType ? "border-red-500" : ""}`}
          >
            <option value="">{t("Select...")}</option>
            {paymentTypes.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
          </select>
          {formErrors.paymentType && (
            <div className="text-danger-500 text-sm">{formErrors.paymentType}</div>
          )}
        </div>

        {/* Description */}
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-600 mb-1">
            {t("Note / Description")}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("e.g. Cash received")}
            className="input w-full"
            autoComplete="off"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 pb-0.5">
          <Button variant="warning" type="submit" disabled={saving}>
            {saving ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
                {t("Saving...")}
              </>
            ) : (
              t("Save")
            )}
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={onCancel}
            disabled={saving}
          >
            <FontAwesomeIcon icon={faXmark} className="me-1" />
            {t("Cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-component: Summary card
// ---------------------------------------------------------------------------

interface SummaryCardProps {
  label: string;
  value: string;
  accent: "amber" | "blue" | "green";
  icon: React.ReactNode;
}

const ACCENT_CLASSES: Record<SummaryCardProps["accent"], string> = {
  amber: "border-s-4 border-amber-400 bg-amber-50",
  blue: "border-s-4 border-blue-400 bg-blue-50",
  green: "border-s-4 border-green-400 bg-green-50",
};

const ICON_CLASSES: Record<SummaryCardProps["accent"], string> = {
  amber: "text-amber-500",
  blue: "text-blue-500",
  green: "text-green-500",
};

const VALUE_CLASSES: Record<SummaryCardProps["accent"], string> = {
  amber: "text-amber-700",
  blue: "text-blue-700",
  green: "text-green-700",
};

const SummaryCard: FC<SummaryCardProps> = ({ label, value, accent, icon }) => (
  <div
    className={`rounded-xl shadow-sm p-4 flex items-center gap-4 ${ACCENT_CLASSES[accent]}`}
  >
    <div className={`text-2xl ${ICON_CLASSES[accent]}`}>{icon}</div>
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-xl font-bold mt-0.5 ${VALUE_CLASSES[accent]}`}>
        {value}
      </p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main component: DebtManagement
// ---------------------------------------------------------------------------

export const DebtManagement: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Data state
  const [customers, setCustomers] = useState<ReportCustomerItem[]>([]);
  const [apiTotals, setApiTotals] = useState<{ totalOutstanding: number; totalCollected: number }>({ totalOutstanding: 0, totalCollected: 0 });
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Client-side search
  const [searchQuery, setSearchQuery] = useState("");

  // Row expand state (id can be number from report API or string)
  const [expandedRow, setExpandedRow] = useState<{
    id: string | number;
    panel: "history" | "payment";
  } | null>(null);

  // Sort state
  type SortKey = "name" | "outstanding";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("outstanding");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ---------------------------------------------------------------------------
  // Fetch customers with debt from report endpoint
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res: ReportResponse = await fetchJson(REPORT_CUSTOMERS + '?debtOnly=1');
      setCustomers(res.customers ?? []);
      setApiTotals({
        totalOutstanding: res.totalOutstanding ?? 0,
        totalCollected: res.totalCollected ?? 0,
      });
    } catch (e: any) {
      let msg = t("Failed to load customer data");
      if (e instanceof HttpException) {
        try {
          const body = await e.response.json();
          msg = body["hydra:description"] || body.detail || msg;
        } catch {}
        if (e.code === 403) msg = "Vous n'avez pas les droits nécessaires.";
      }
      notify({ type: "error", description: msg });
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ---------------------------------------------------------------------------
  // Client-side search (filter loaded customers by name or phone)
  // ---------------------------------------------------------------------------

  const displayList = useMemo((): ReportCustomerItem[] => {
    let base = customers;

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      const isPhone = /^\d[\d\s-]*$/.test(q);
      base = customers.filter((c) => {
        if (isPhone) {
          return (c.phone ?? "").replace(/[\s-]/g, "").includes(q.replace(/[\s-]/g, ""));
        }
        return c.name.toLowerCase().includes(q);
      });
    }

    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = a.outstanding - b.outstanding;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [customers, searchQuery, sortKey, sortDir]);

  // ---------------------------------------------------------------------------
  // Sort toggle
  // ---------------------------------------------------------------------------

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortIcon: FC<{ col: SortKey }> = ({ col }) => {
    if (sortKey !== col) return null;
    return (
      <FontAwesomeIcon
        icon={sortDir === "asc" ? faChevronUp : faChevronDown}
        className="ms-1 text-xs"
      />
    );
  };

  // ---------------------------------------------------------------------------
  // Row actions
  // ---------------------------------------------------------------------------

  const togglePanel = (
    id: string | number,
    panel: "history" | "payment"
  ) => {
    setExpandedRow((prev) => {
      // eslint-disable-next-line eqeqeq
      if (prev?.id == id && prev?.panel === panel) return null;
      return { id, panel };
    });
  };

  const handlePaymentSuccess = (
    customerId: number | string,
    newPayment: CustomerPayment,
    paidAmount: number
  ) => {
    setApiTotals((prev) => ({
      totalOutstanding: Math.max(0, prev.totalOutstanding - paidAmount),
      totalCollected: prev.totalCollected + paidAmount,
    }));

    setCustomers((prev) => {
      const updated = prev.map((c) => {
        // eslint-disable-next-line eqeqeq
        if (c.id != customerId) return c;
        return {
          ...c,
          outstanding: c.outstanding - paidAmount,
          payments: [newPayment, ...(c.payments ?? [])],
        };
      });

      // eslint-disable-next-line eqeqeq
      const target = updated.find((c) => c.id == customerId);
      const cleared = !target || target.outstanding <= 0;

      if (cleared) {
        setExpandedRow(null);
        setTimeout(() => {
          notify({ type: "success", description: t("Customer debt fully cleared!") });
        }, 100);
        return updated.filter((c) => c.outstanding > 0);
      }

      setExpandedRow({ id: String(customerId), panel: "history" });
      return updated;
    });
  };

  // ---------------------------------------------------------------------------
  // Last payment date helper
  // ---------------------------------------------------------------------------

  const lastPaymentDate = (c: ReportCustomerItem): string => {
    const payments = c.payments ?? [];
    if (payments.length === 0) return t("Never");
    const sorted = [...payments].sort(
      (a, b) =>
        parseDate(b.createdAt).toMillis() -
        parseDate(a.createdAt).toMillis()
    );
    return parseDate(sorted[0].createdAt).toFormat("dd/MM/yyyy HH:mm");
  };

  // ---------------------------------------------------------------------------
  // Debt severity helpers
  // ---------------------------------------------------------------------------

  const debtColorClass = (amount: number): string => {
    if (amount <= 0) return "text-gray-400";
    if (amount >= 10000) return "text-red-600 font-bold";
    if (amount >= 2000) return "text-amber-600 font-semibold";
    return "text-amber-500";
  };

  const rowBgClass = (amount: number): string => {
    if (amount >= 10000) return "bg-red-50/50 hover:bg-red-50";
    if (amount >= 2000) return "bg-amber-50/30 hover:bg-amber-50/50";
    return "hover:bg-gray-50";
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/pos')}
          className="p-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          title={t("Back")}
        >
          <FontAwesomeIcon
            icon={faArrowLeft}
            className="text-gray-600 text-lg"
          />
        </button>
        <div className="p-2.5 bg-amber-100 rounded-lg">
          <FontAwesomeIcon
            icon={faCreditCard}
            className="text-amber-600 text-lg"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {t("Debt Management")}
          </h1>
          <p className="text-sm text-gray-500">
            {t("Track outstanding balances and record customer payments")}
          </p>
        </div>

        <div className="ms-auto">
          <Button
            variant="secondary"
            type="button"
            onClick={loadData}
            disabled={loading}
          >
            {loading ? (
              <FontAwesomeIcon icon={faSpinner} spin className="me-2" />
            ) : null}
            {t("Refresh")}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard
          label={t("Total outstanding debt")}
          value={withCurrency(apiTotals.totalOutstanding)}
          accent="amber"
          icon={<FontAwesomeIcon icon={faMoneyBillWave} />}
        />
        <SummaryCard
          label={t("Customers with debt")}
          value={String(customers.length)}
          accent="blue"
          icon={<FontAwesomeIcon icon={faUsers} />}
        />
        <SummaryCard
          label={t("Total collected")}
          value={withCurrency(apiTotals.totalCollected)}
          accent="green"
          icon={<FontAwesomeIcon icon={faHistory} />}
        />
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-lg">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("Search by name or phone...")}
            className="input w-full ps-9 pe-8"
            autoComplete="off"
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setSearchQuery("")}
              aria-label={t("Clear search")}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </div>

        {searchQuery.trim() && (
          <span className="text-sm text-gray-500">
            {displayList.length} {t("results")}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading && !initialized ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <FontAwesomeIcon icon={faSpinner} spin className="me-3 text-xl" />
            {t("Loading...")}
          </div>
        ) : displayList.length === 0 && initialized ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FontAwesomeIcon icon={faCheckCircle} className="text-4xl text-green-300 mb-3" />
            <p className="text-base font-semibold text-gray-500">
              {searchQuery
                ? t("No customers match your search")
                : t("All debts are cleared")}
            </p>
            {!searchQuery && (
              <p className="text-sm text-gray-400 mt-1">
                {t("No customer has an outstanding balance")}
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs uppercase tracking-wide">
                  <th
                    className="text-start px-4 py-3 font-semibold cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => toggleSort("name")}
                  >
                    {t("Customer")} <SortIcon col="name" />
                  </th>
                  <th className="text-start px-4 py-3 font-semibold">
                    {t("Phone")}
                  </th>
                  <th
                    className="text-start px-4 py-3 font-semibold cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => toggleSort("outstanding")}
                  >
                    {t("Outstanding")} <SortIcon col="outstanding" />
                  </th>
                  <th className="text-start px-4 py-3 font-semibold">
                    {t("Credit limit")}
                  </th>
                  <th className="text-start px-4 py-3 font-semibold">
                    {t("Last payment")}
                  </th>
                  <th className="text-end px-4 py-3 font-semibold">
                    {t("Actions")}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {displayList.map((customer) => {
                  const outstanding = customer.outstanding;
                  // eslint-disable-next-line eqeqeq
                  const isHistoryOpen =
                    expandedRow?.id == customer.id &&
                    expandedRow?.panel === "history";
                  // eslint-disable-next-line eqeqeq
                  const isPaymentOpen =
                    expandedRow?.id == customer.id &&
                    expandedRow?.panel === "payment";

                  return (
                    <React.Fragment key={customer.id}>
                      {/* Main row */}
                      <tr className={`transition-colors ${rowBgClass(outstanding)}`}>
                        {/* Name */}
                        <td className="px-4 py-4 font-medium text-gray-800">
                          {customer.name}
                        </td>

                        {/* Phone */}
                        <td className="px-4 py-4 text-gray-500">
                          {customer.phone ?? "-"}
                        </td>

                        {/* Outstanding */}
                        <td className="px-4 py-4">
                          <span className={debtColorClass(outstanding)}>
                            {withCurrency(outstanding)}
                          </span>
                        </td>

                        {/* Credit limit */}
                        <td className="px-4 py-4 text-gray-500">
                          {customer.creditLimit
                            ? withCurrency(customer.creditLimit)
                            : (
                              <span className="text-gray-300 text-xs italic">
                                {t("no limit")}
                              </span>
                            )}
                        </td>

                        {/* Last payment */}
                        <td className="px-4 py-4 text-gray-500 text-xs">
                          <span dir="ltr" className="inline-block">
                            {lastPaymentDate(customer)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant={isPaymentOpen ? "warning" : "primary"}
                              onClick={() =>
                                togglePanel(customer.id, "payment")
                              }
                              title={t("Record payment")}
                            >
                              <FontAwesomeIcon
                                icon={faCreditCard}
                                className="me-1"
                              />
                              {t("Payment")}
                            </Button>

                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                togglePanel(customer.id, "history")
                              }
                              title={t("Payment history")}
                            >
                              <FontAwesomeIcon
                                icon={faHistory}
                                className="me-1"
                              />
                              {(customer.payments ?? []).length}
                              <FontAwesomeIcon
                                icon={
                                  isHistoryOpen ? faChevronUp : faChevronDown
                                }
                                className="ms-1 text-xs"
                              />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Inline payment form */}
                      {isPaymentOpen && (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <InlinePaymentForm
                              customer={customer}
                              onSuccess={handlePaymentSuccess}
                              onCancel={() => setExpandedRow(null)}
                            />
                          </td>
                        </tr>
                      )}

                      {/* Payment history sub-rows */}
                      {isHistoryOpen && (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <div className="bg-gray-50 border-t border-gray-100">
                              <div className="px-4 py-2 flex items-center gap-2">
                                <FontAwesomeIcon
                                  icon={faHistory}
                                  className="text-gray-400 text-xs"
                                />
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                  {t("Payment history")} — {customer.name}
                                </span>
                              </div>

                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-gray-400 uppercase border-t border-gray-100">
                                    <th className="text-start ps-10 py-1.5 font-medium">
                                      {t("Date")}
                                    </th>
                                    <th className="text-start py-1.5 font-medium">
                                      {t("Amount")}
                                    </th>
                                    <th className="text-start py-1.5 font-medium">
                                      {t("Payment type")}
                                    </th>
                                    <th className="text-start pe-4 py-1.5 font-medium">
                                      {t("Description")}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <PaymentHistory
                                    payments={customer.payments ?? []}
                                  />
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
