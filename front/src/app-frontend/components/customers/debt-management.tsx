import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
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
  CUSTOMER_LIST,
  REPORT_CUSTOMERS,
  PAYMENT_TYPE_LIST,
} from "../../../api/routing/routes/backend.app";
import { Customer } from "../../../api/model/customer";
import { CustomerPayment } from "../../../api/model/customer.payment";
import { PaymentType } from "../../../api/model/payment.type";
import { withCurrency } from "../../../lib/currency/currency";
import { notify } from "../../../app-common/components/confirm/notification";
import { getErrors, hasErrors } from "../../../lib/error/error";
import { ValidationMessage } from "../../../api/model/validation";
import {
  HttpException,
} from "../../../lib/http/exception/http.exception";
import { handleFormError } from "../../../lib/error/handle.form.error";
import { Input } from "../../../app-common/components/input/input";
import { Button } from "../../../app-common/components/input/button";
import { ErrorBoundary } from "../../../app-common/components/error/error-boundary";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReportCustomerItem extends Customer {
  // The report endpoint enriches each customer with aggregated totals.
  // We use the base Customer fields and treat `outstanding` as the live debt.
  totalCollected?: number;
}

interface ReportResponse {
  customers: ReportCustomerItem[];
  totalOutstanding: number;
  totalCustomers: number;
  creditCustomers: number;
}

// Payment form field shape
interface PaymentFormValues {
  amount: string;
  description: string;
  paymentType: string;
}

// ---------------------------------------------------------------------------
// Yup schema
// ---------------------------------------------------------------------------

const PaymentSchema = yup.object({
  amount: yup
    .string()
    .required(ValidationMessage.Required)
    .test("is-positive", "Amount must be greater than 0", (v) => {
      const n = parseFloat(v ?? "");
      return !isNaN(n) && n > 0;
    }),
  description: yup.string().trim().required(ValidationMessage.Required),
  paymentType: yup.string().required(ValidationMessage.Required),
});

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
// Helper: effective outstanding (now already includes openingBalance from API)
// ---------------------------------------------------------------------------

function effectiveOutstanding(c: Customer): number {
  return c.outstanding;
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
  onSuccess: (customerId: string, newPayment: CustomerPayment) => void;
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

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: yupResolver(PaymentSchema),
    defaultValues: {
      amount: '',
      description: '',
      paymentType: '',
    },
  });

  const onSubmit = async (values: PaymentFormValues) => {
    setSaving(true);
    try {
      const iri = customer["@id"] ?? `/api/customers/${customer.id}`;
      const body: Record<string, any> = {
        customer: iri,
        amount: String(values.amount),
        description: values.description,
      };

      if (values.paymentType) {
        body.paymentType = `/api/payments/${values.paymentType}`;
      }

      const response: CustomerPayment = await fetchJson(CUSTOMER_PAYMENT_CREATE, {
        method: "POST",
        body: JSON.stringify(body),
      });

      // API Platform may not return createdAt (not in serialization group),
      // so we fill it in for local state display.
      if (!response.createdAt) {
        response.createdAt = new Date().toISOString();
      }

      // Enrich paymentType for display if not returned by API
      if (!response.paymentType && values.paymentType) {
        const pt = paymentTypes.find((p) => String(p.id) === values.paymentType);
        if (pt) {
          response.paymentType = { id: Number(pt.id), name: pt.name };
        }
      }

      notify({
        type: "success",
        description: t("Payment recorded successfully"),
      });

      reset();
      onSuccess(customer.id, response);
    } catch (exception: any) {
      await handleFormError(exception, { setError: setError as any });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-wrap items-end gap-3"
      >
        {/* Amount */}
        <div className="flex flex-col min-w-[140px]">
          <label className="text-xs font-medium text-gray-600 mb-1">
            {t("Amount")} <span className="text-red-500">*</span>
          </label>
          <input
            {...register("amount")}
            type="text"
            inputMode="decimal"
            pattern="[0-9]*\.?[0-9]*"
            placeholder="0"
            className={`input w-full ${hasErrors(errors.amount) ? 'error' : ''}`}
            autoFocus
          />
          {getErrors(errors.amount)}
        </div>

        {/* Payment Type */}
        <div className="flex flex-col min-w-[160px]">
          <label className="text-xs font-medium text-gray-600 mb-1">
            {t("Payment type")} <span className="text-red-500">*</span>
          </label>
          <select
            {...register("paymentType")}
            className={`input w-full ${hasErrors(errors.paymentType) ? "border-red-500" : ""}`}
          >
            <option value="">{t("Select...")}</option>
            {paymentTypes.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
          </select>
          {getErrors(errors.paymentType)}
        </div>

        {/* Description */}
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-600 mb-1">
            {t("Note / Description")} <span className="text-red-500">*</span>
          </label>
          <Input
            {...register("description")}
            placeholder={t("e.g. Cash received")}
            className="w-full"
            hasError={hasErrors(errors.description)}
          />
          {getErrors(errors.description)}
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
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ReportCustomerItem[] | null>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Row expand state: maps customerId -> which panel is open
  // "history" | "payment" | null
  const [expandedRow, setExpandedRow] = useState<{
    id: string;
    panel: "history" | "payment";
  } | null>(null);

  // Sort state
  type SortKey = "name" | "outstanding";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("outstanding");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ---------------------------------------------------------------------------
  // Fetch all customers with debt from report endpoint
  // ---------------------------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res: ReportResponse = await fetchJson(REPORT_CUSTOMERS);
      setCustomers(res.customers ?? []);
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
  // Search handler (same detection logic as customer.search.tsx)
  // ---------------------------------------------------------------------------

  const searchCustomers = useCallback(
    async (q: string) => {
      if (q.trim().length < 1) {
        setSearchResults(null);
        return;
      }
      setSearching(true);
      try {
        const trimmed = q.trim();
        const isPhone = /^\d[\d\s-]*$/.test(trimmed);
        const param = isPhone
          ? `phone=${encodeURIComponent(trimmed.replace(/[\s-]/g, ""))}`
          : `name=${encodeURIComponent(trimmed)}`;

        const res = await jsonRequest(`${CUSTOMER_LIST}?${param}`);
        const data = await res.json();
        const list: Customer[] = data["hydra:member"] ?? [];
        setSearchResults(list as ReportCustomerItem[]);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    },
    []
  );

  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 1) {
      setSearchResults(null);
      return;
    }
    debounceRef.current = setTimeout(() => searchCustomers(val), 300);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  // ---------------------------------------------------------------------------
  // Displayed list: search results take priority, then all customers
  // ---------------------------------------------------------------------------

  const displayList = useMemo((): ReportCustomerItem[] => {
    const base = searchResults !== null ? searchResults : customers;

    return [...base].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = a.name.localeCompare(b.name);
      } else {
        cmp = effectiveOutstanding(a) - effectiveOutstanding(b);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [customers, searchResults, sortKey, sortDir]);

  // ---------------------------------------------------------------------------
  // Summary totals (always from the full customer list, not filtered)
  // ---------------------------------------------------------------------------

  const totals = useMemo(() => {
    const withDebt = customers.filter((c) => effectiveOutstanding(c) !== 0);
    const totalDebt = customers.reduce(
      (acc, c) => {
        const o = effectiveOutstanding(c);
        return o > 0 ? acc + o : acc;
      },
      0
    );
    const totalCollected = customers.reduce(
      (acc, c) =>
        acc +
        (c.payments ?? []).reduce(
          (sum, p) => sum + Number(p.amount),
          0
        ),
      0
    );
    return { totalDebt, withDebtCount: withDebt.length, totalCollected };
  }, [customers]);

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
    id: string,
    panel: "history" | "payment"
  ) => {
    setExpandedRow((prev) => {
      if (prev?.id === id && prev?.panel === panel) return null;
      return { id, panel };
    });
  };

  // Called when a payment is saved successfully
  const handlePaymentSuccess = (
    customerId: string,
    newPayment: CustomerPayment
  ) => {
    // Update the customer in local state
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== customerId) return c;
        const paidAmount = Number(newPayment.amount);
        return {
          ...c,
          outstanding: c.outstanding - paidAmount,
          payments: [newPayment, ...(c.payments ?? [])],
        };
      })
    );

    // Collapse the payment form, open history so user sees the new entry
    setExpandedRow({ id: customerId, panel: "history" });
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
  // Debt color helper
  // ---------------------------------------------------------------------------

  const debtColorClass = (amount: number): string => {
    if (amount <= 0) return "text-gray-400";
    if (amount >= 10000) return "text-red-600 font-bold";
    if (amount >= 2000) return "text-amber-600 font-semibold";
    return "text-amber-500";
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
          value={withCurrency(totals.totalDebt)}
          accent="amber"
          icon={<FontAwesomeIcon icon={faMoneyBillWave} />}
        />
        <SummaryCard
          label={t("Customers with debt")}
          value={String(totals.withDebtCount)}
          accent="blue"
          icon={<FontAwesomeIcon icon={faUsers} />}
        />
        <SummaryCard
          label={t("Total collected")}
          value={withCurrency(totals.totalCollected)}
          accent="green"
          icon={<FontAwesomeIcon icon={faHistory} />}
        />
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-lg">
          <FontAwesomeIcon
            icon={searching ? faSpinner : faMagnifyingGlass}
            spin={searching}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={onSearchChange}
            placeholder={t("Search by name or phone...")}
            className="input w-full ps-9 pe-8"
            autoComplete="off"
          />
          {searchQuery && (
            <button
              type="button"
              className="absolute end-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={clearSearch}
              aria-label={t("Clear search")}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          )}
        </div>

        {searchResults !== null && (
          <span className="text-sm text-gray-500">
            {searchResults.length} {t("results")}
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
                {displayList.length === 0 && initialized && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-12 text-center text-gray-400"
                    >
                      {searchQuery
                        ? t("No customers match your search")
                        : t("No customer debt records found")}
                    </td>
                  </tr>
                )}

                {displayList.map((customer) => {
                  const outstanding = effectiveOutstanding(customer);
                  const isHistoryOpen =
                    expandedRow?.id === customer.id &&
                    expandedRow?.panel === "history";
                  const isPaymentOpen =
                    expandedRow?.id === customer.id &&
                    expandedRow?.panel === "payment";

                  return (
                    <React.Fragment key={customer.id}>
                      {/* Main row */}
                      <tr className="hover:bg-gray-50 transition-colors">
                        {/* Name */}
                        <td className="px-4 py-3 font-medium text-gray-800">
                          {customer.name}
                        </td>

                        {/* Phone */}
                        <td className="px-4 py-3 text-gray-500">
                          {customer.phone ?? "-"}
                        </td>

                        {/* Outstanding */}
                        <td className="px-4 py-3">
                          <span className={debtColorClass(outstanding)}>
                            {withCurrency(outstanding)}
                          </span>
                        </td>

                        {/* Credit limit */}
                        <td className="px-4 py-3 text-gray-500">
                          {customer.creditLimit
                            ? withCurrency(customer.creditLimit)
                            : (
                              <span className="text-gray-300 text-xs italic">
                                {t("no limit")}
                              </span>
                            )}
                        </td>

                        {/* Last payment */}
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          <span dir="ltr" className="inline-block">
                            {lastPaymentDate(customer)}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {/* Record payment button */}
                            <Button
                              type="button"
                              variant={isPaymentOpen ? "warning" : "primary"}
                              size="sm"
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

                            {/* History toggle button */}
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
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
                            <ErrorBoundary>
                              <InlinePaymentForm
                                customer={customer}
                                onSuccess={handlePaymentSuccess}
                                onCancel={() => setExpandedRow(null)}
                              />
                            </ErrorBoundary>
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
