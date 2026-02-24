import React, { FC, useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAtom } from "jotai";
import { defaultState } from "../../../store/jotai";
import { Customer } from "../../../api/model/customer";
import { jsonRequest } from "../../../api/request/request";
import { CUSTOMER_LIST } from "../../../api/routing/routes/backend.app";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faTimes, faSearch, faBan, faPhone } from "@fortawesome/free-solid-svg-icons";
import { withCurrency } from "../../../lib/currency/currency";

export const CustomerSearch: FC = () => {
  const { t } = useTranslation();
  const [appState, setAppState] = useAtom(defaultState);
  const { customer } = appState;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const searchCustomers = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const trimmed = q.trim();
      const isPhone = /^\d[\d\s\-]*$/.test(trimmed);
      const param = isPhone
        ? `phone=${encodeURIComponent(trimmed.replace(/[\s\-]/g, ''))}`
        : `name=${encodeURIComponent(trimmed)}`;
      const res = await jsonRequest(`${CUSTOMER_LIST}?${param}`);
      const data = await res.json();
      const list: Customer[] = data["hydra:member"] || [];
      setResults(list);
      setOpen(list.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCustomers(val), 300);
  };

  const selectCustomer = (c: Customer) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setAppState(prev => ({
      ...prev,
      customer: c,
      customerName: c.name,
    }));
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const detachCustomer = () => {
    setAppState(prev => ({
      ...prev,
      customer: undefined,
      customerName: "",
    }));
    setQuery("");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // If customer is selected, show badge
  if (customer) {
    return (
      <div className="cs-badge">
        <FontAwesomeIcon icon={faUser} className="cs-badge__icon" />
        <span className="cs-badge__name">{customer.name}</span>
        {customer.allowCreditSale && (
          <span className="cs-badge__balance" data-negative={customer.outstanding > 0}>
            {withCurrency(Math.abs(customer.outstanding))}
          </span>
        )}
        {!customer.allowCreditSale && (
          <span className="cs-badge__no-credit">
            <FontAwesomeIcon icon={faBan} className="me-1" />
            {t("No credit")}
          </span>
        )}
        <button
          type="button"
          className="cs-badge__remove"
          onClick={detachCustomer}
          title={t("Detach customer?")}
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
    );
  }

  // Search input + dropdown
  return (
    <div className="cs-search" ref={containerRef}>
      <div className="cs-search__input-wrap">
        <FontAwesomeIcon icon={faSearch} className="cs-search__icon" />
        <input
          ref={inputRef}
          type="text"
          className="cs-search__input mousetrap"
          placeholder={t("Search by name or phone...")}
          value={query}
          onChange={onInputChange}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          autoComplete="off"
        />
        {loading && <span className="cs-search__spinner" />}
      </div>

      {open && results.length > 0 && (
        <div className="cs-search__dropdown">
          {results.map(c => (
            <button
              key={c.id}
              type="button"
              className="cs-search__item"
              onClick={() => selectCustomer(c)}
            >
              {/* Row 1: icon + full name */}
              <div className="cs-search__item-row1">
                <FontAwesomeIcon icon={faUser} className="cs-search__item-icon" />
                <span className="cs-search__item-name">{c.name}</span>
              </div>
              {/* Row 2: phone + credit status */}
              <div className="cs-search__item-row2">
                {c.phone && (
                  <span className="cs-search__item-phone">
                    <FontAwesomeIcon icon={faPhone} className="me-1" />
                    {c.phone}
                  </span>
                )}
                {c.allowCreditSale ? (
                  <span className="cs-search__item-balance" data-negative={c.outstanding > 0}>
                    {withCurrency(c.outstanding)}
                  </span>
                ) : (
                  <span className="cs-search__item-no-credit">
                    <FontAwesomeIcon icon={faBan} className="me-1" />
                    {t("No credit")}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && query.trim().length > 0 && results.length === 0 && !loading && (
        <div className="cs-search__dropdown">
          <div className="cs-search__empty">
            {t("No customer found")}
          </div>
        </div>
      )}
    </div>
  );
};
