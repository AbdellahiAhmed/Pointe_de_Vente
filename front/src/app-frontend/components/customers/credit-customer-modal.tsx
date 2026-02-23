import React, {
  FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTimes,
  faSearch,
  faUser,
  faPhone,
  faUserPlus,
  faCheckCircle,
  faBan,
  faSpinner,
  faCreditCard,
} from "@fortawesome/free-solid-svg-icons";
import { Customer } from "../../../api/model/customer";
import { jsonRequest } from "../../../api/request/request";
import {
  CUSTOMER_LIST,
  CUSTOMER_CREATE,
} from "../../../api/routing/routes/backend.app";
import { withCurrency } from "../../../lib/currency/currency";

// ─── Props ───────────────────────────────────────────────────────────────────

interface CreditCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onCustomerSelected: (customer: Customer) => void;
}

// ─── Inline create form state ─────────────────────────────────────────────────

interface CreateFormState {
  name: string;
  phone: string;
  allowCreditSale: boolean;
  creditLimit: string;
}

const EMPTY_FORM: CreateFormState = {
  name: "",
  phone: "",
  allowCreditSale: true,
  creditLimit: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export const CreditCustomerModal: FC<CreditCustomerModalProps> = ({
  open,
  onClose,
  onCustomerSelected,
}) => {
  const { t } = useTranslation();

  // ── Search state ──
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Create form state ──
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateFormState, string>>>({});
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Reset state when modal opens/closes ──
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSearchPerformed(false);
      setShowCreateForm(false);
      setForm(EMPTY_FORM);
      setFormErrors({});
      setCreateError(null);
      // Focus search input after transition
      setTimeout(() => searchInputRef.current?.focus(), 80);
    }
  }, [open]);

  // ── Close on Escape ──
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // ── Search API call ──
  const searchCustomers = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setResults([]);
      setSearchPerformed(false);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const isPhone = /^\d[\d\s\-]*$/.test(trimmed);
      const param = isPhone
        ? `phone=${encodeURIComponent(trimmed.replace(/[\s\-]/g, ""))}`
        : `name=${encodeURIComponent(trimmed)}`;
      const res = await jsonRequest(`${CUSTOMER_LIST}?${param}`);
      const data = await res.json();
      const list: Customer[] = data["hydra:member"] ?? [];
      setResults(list);
      setSearchPerformed(true);
    } catch {
      setResults([]);
      setSearchPerformed(true);
    } finally {
      setSearching(false);
    }
  }, []);

  const onQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length === 0) {
      setResults([]);
      setSearchPerformed(false);
      return;
    }
    debounceRef.current = setTimeout(() => searchCustomers(val), 300);
  };

  // ── Customer selection ──
  const handleSelect = (c: Customer) => {
    onCustomerSelected(c);
    onClose();
  };

  // ── Create form handlers ──
  const onFormChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear field error on change
    if (formErrors[name as keyof CreateFormState]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CreateFormState, string>> = {};
    if (!form.name.trim()) {
      errors.name = t("Name is required");
    }
    if (!form.phone.trim()) {
      errors.phone = t("Phone is required");
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!validateForm()) return;

    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        openingBalance: "0",
        allowCreditSale: form.allowCreditSale,
        creditLimit:
          form.allowCreditSale && form.creditLimit.trim() !== ""
            ? String(form.creditLimit)
            : null,
      };

      const res = await jsonRequest(CUSTOMER_CREATE, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const message =
          errData?.["hydra:description"] ||
          errData?.detail ||
          t("Failed to create customer");
        setCreateError(message);
        return;
      }

      const created: Customer = await res.json();
      onCustomerSelected(created);
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("An error occurred");
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setCreateError(null);
  };

  const outstandingBalance = (c: Customer): number =>
    c.outstanding + Number(c.openingBalance ?? 0);

  if (!open) return null;

  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t("Select customer for credit payment")}
    >
      {/* ── Modal card ── */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[calc(100%-2rem)] max-w-md max-h-[80vh] flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-600 shrink-0">
              <FontAwesomeIcon icon={faCreditCard} />
            </span>
            <h2 className="text-sm font-bold text-gray-800 leading-tight">
              {t("Select customer for credit payment")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
            aria-label={t("Close")}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Search section ── */}
          <div className="px-5 pt-4 pb-2">
            <div className="relative">
              <span className="absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400 pointer-events-none">
                {searching ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <FontAwesomeIcon icon={faSearch} />
                )}
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="w-full ps-9 pe-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors placeholder:text-gray-400"
                placeholder={t("Search by name or phone...")}
                value={query}
                onChange={onQueryChange}
                autoComplete="off"
              />
            </div>
          </div>

          {/* ── Search results ── */}
          {results.length > 0 && (
            <ul className="px-5 pb-2" role="listbox">
              {results.map((c) => {
                const balance = outstandingBalance(c);
                const hasDebt = balance > 0;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="w-full text-start py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer rounded-lg px-2 -mx-2"
                      onClick={() => handleSelect(c)}
                      role="option"
                    >
                      {/* Row 1: name + credit badge */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-gray-900 text-sm truncate">
                          <FontAwesomeIcon
                            icon={faUser}
                            className="me-2 text-gray-400"
                            size="xs"
                          />
                          {c.name}
                        </span>
                        {c.allowCreditSale ? (
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                            <FontAwesomeIcon icon={faCheckCircle} size="xs" />
                            {t("Credit allowed")}
                          </span>
                        ) : (
                          <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                            <FontAwesomeIcon icon={faBan} size="xs" />
                            {t("No credit")}
                          </span>
                        )}
                      </div>

                      {/* Row 2: phone + outstanding + credit limit */}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {c.phone && (
                          <span className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faPhone} size="xs" />
                            {c.phone}
                          </span>
                        )}
                        <span
                          className={
                            hasDebt ? "text-amber-700 font-semibold" : "text-gray-500"
                          }
                        >
                          {t("Balance")}: {withCurrency(balance)}
                        </span>
                        {c.creditLimit && Number(c.creditLimit) > 0 && (
                          <span className="text-gray-400">
                            {t("Limit")}: {withCurrency(Number(c.creditLimit))}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* ── Empty state ── */}
          {searchPerformed && results.length === 0 && !searching && (
            <div className="flex flex-col items-center gap-3 px-5 py-6 text-center">
              <span className="text-2xl">
                <FontAwesomeIcon icon={faUser} className="text-gray-300" size="2x" />
              </span>
              <p className="text-sm text-gray-500 font-medium">
                {t("No customer found")}
              </p>
              {!showCreateForm && (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 transition-colors px-4 py-2 rounded-lg shadow-sm"
                >
                  <FontAwesomeIcon icon={faUserPlus} />
                  {t("Create new customer")}
                </button>
              )}
            </div>
          )}

          {/* ── Create form toggle (when there are results or no search yet) ── */}
          {(!searchPerformed || results.length > 0) && !showCreateForm && (
            <div className="px-5 pb-4">
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-amber-600 border-2 border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-50 transition-colors px-4 py-2.5 rounded-lg"
              >
                <FontAwesomeIcon icon={faUserPlus} />
                {t("New customer +")}
              </button>
            </div>
          )}

          {/* ── Inline create form ── */}
          {showCreateForm && (
            <div className="mx-5 mb-5 mt-1 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 bg-gray-100">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  {t("New customer")}
                </p>
              </div>

              <form onSubmit={handleCreate} className="px-4 py-4 flex flex-col gap-3" noValidate>
                {/* Name */}
                <div>
                  <label
                    htmlFor="ccm-name"
                    className="block text-xs font-semibold text-gray-600 mb-1"
                  >
                    {t("Name")}
                    <span className="text-red-500 ms-0.5">*</span>
                  </label>
                  <input
                    id="ccm-name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={onFormChange}
                    placeholder={t("Customer name")}
                    className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors ${
                      formErrors.name
                        ? "border-red-400 focus:ring-red-300"
                        : "border-gray-300"
                    }`}
                    autoComplete="off"
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.name}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label
                    htmlFor="ccm-phone"
                    className="block text-xs font-semibold text-gray-600 mb-1"
                  >
                    {t("Phone")}
                    <span className="text-red-500 ms-0.5">*</span>
                  </label>
                  <input
                    id="ccm-phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={onFormChange}
                    placeholder="+222 XXXX XXXX"
                    className={`w-full px-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors ${
                      formErrors.phone
                        ? "border-red-400 focus:ring-red-300"
                        : "border-gray-300"
                    }`}
                    autoComplete="off"
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-xs text-red-500">{formErrors.phone}</p>
                  )}
                </div>

                {/* Allow credit toggle */}
                <div className="flex items-center justify-between py-1">
                  <label
                    htmlFor="ccm-allow-credit"
                    className="text-sm font-semibold text-gray-700 cursor-pointer select-none"
                  >
                    {t("Allow credit")}
                  </label>
                  <button
                    id="ccm-allow-credit"
                    type="button"
                    role="switch"
                    aria-checked={form.allowCreditSale}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        allowCreditSale: !prev.allowCreditSale,
                        creditLimit: !prev.allowCreditSale ? prev.creditLimit : "",
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 ${
                      form.allowCreditSale ? "bg-amber-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        form.allowCreditSale ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Credit limit (only if credit is on) */}
                {form.allowCreditSale && (
                  <div>
                    <label
                      htmlFor="ccm-credit-limit"
                      className="block text-xs font-semibold text-gray-600 mb-1"
                    >
                      {t("Credit limit")}
                      <span className="ms-1 text-gray-400 font-normal">
                        ({t("optional")})
                      </span>
                    </label>
                    <input
                      id="ccm-credit-limit"
                      name="creditLimit"
                      type="number"
                      min="0"
                      step="any"
                      value={form.creditLimit}
                      onChange={onFormChange}
                      placeholder="0"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-colors"
                    />
                  </div>
                )}

                {/* Server-side create error */}
                {createError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {createError}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 inline-flex items-center justify-center gap-2 text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors px-4 py-2 rounded-lg shadow-sm"
                  >
                    {creating ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin size="xs" />
                        {t("Saving...")}
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faUserPlus} size="xs" />
                        {t("Save & select")}
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelCreate}
                    disabled={creating}
                    className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed transition-colors rounded-lg"
                  >
                    {t("Cancel")}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
