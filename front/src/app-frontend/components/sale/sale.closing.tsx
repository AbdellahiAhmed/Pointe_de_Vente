import React, { FC, PropsWithChildren, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Modal } from "../../../app-common/components/modal/modal";
import { Closing } from "../../../api/model/closing";
import { QueryString } from "../../../lib/location/query.string";
import { fetchJson, jsonRequest } from "../../../api/request/request";
import { CLOSING_EDIT, CLOSING_CLOSE, CLOSING_OPENED, EXPENSE_LIST, ORDER_LIST } from "../../../api/routing/routes/backend.app";
import { Button } from "../../../app-common/components/input/button";
import { Input } from "../../../app-common/components/input/input";
import { Controller, useForm } from "react-hook-form";
import { DateTime } from "luxon";
import { Expenses } from "./expenses";
import { Expense } from "../../../api/model/expense";
import { useSelector } from "react-redux";
import { getAuthorizedUser } from "../../../duck/auth/auth.selector";
import classNames from "classnames";
import { KeyboardInput } from "../../../app-common/components/input/keyboard.input";
import { getStore } from "../../../duck/store/store.selector";
import { getTerminal } from "../../../duck/terminal/terminal.selector";
import { HttpException, UnprocessableEntityException } from "../../../lib/http/exception/http.exception";
import { notify } from "../../../app-common/components/confirm/notification";
import { ValidationResult } from "../../../lib/validator/validation.result";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShopLock,
  faStore,
  faCashRegister,
  faMoneyBillWave,
  faArrowUp,
  faArrowDown,
  faReceipt,
  faCalculator,
  faExclamationTriangle,
  faMobileAlt,
  faCreditCard,
  faHandHoldingUsd,
} from "@fortawesome/free-solid-svg-icons";
import { Tooltip } from "antd";
import useApi from "../../../api/hooks/use.api";
import { Order } from "../../../api/model/order";
import { withCurrency } from "../../../lib/currency/currency";
import { useTranslation } from "react-i18next";

// ─── Sub-components ──────────────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  icon: typeof faStore;
  iconColor?: string;
  children: React.ReactNode;
  muted?: boolean;
}

const SectionCard: FC<SectionCardProps> = ({ title, icon, iconColor = "#2563eb", children, muted = false }) => (
  <div
    className="rounded-xl p-4 mb-3"
    style={{
      border: "1px solid var(--pos-border, #e5e7eb)",
      boxShadow: "var(--pos-shadow-sm, 0 1px 3px rgba(0,0,0,.06))",
      background: muted ? "var(--pos-surface, #f8f9fb)" : "#fff",
    }}
  >
    <div
      className="flex items-center gap-2 mb-3 pb-2"
      style={{ borderBottom: "1px solid var(--pos-border, #e5e7eb)" }}
    >
      <FontAwesomeIcon icon={icon} className="text-sm" style={{ color: iconColor }} />
      <span className="text-[13px] font-semibold text-gray-700 uppercase tracking-wide">{title}</span>
    </div>
    {children}
  </div>
);

interface StatGridItemProps {
  label: string;
  value: React.ReactNode;
}

const StatGridItem: FC<StatGridItemProps> = ({ label, value }) => (
  <div
    className="flex flex-col rounded-lg px-3 py-2"
    style={{
      background: "#fff",
      border: "1px solid var(--pos-border, #e5e7eb)",
    }}
  >
    <span className="text-[11px] text-gray-400 mb-0.5">{label}</span>
    <span className="text-[13px] font-semibold text-gray-800">{value || "—"}</span>
  </div>
);

interface FormRowProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

const FormRow: FC<FormRowProps> = ({ label, children, hint }) => (
  <div className="flex flex-col gap-1 mb-3">
    <label className="text-[12px] font-medium text-gray-500 text-start">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
  </div>
);

// Returns a payment-type icon based on the key name
const getPaymentIcon = (key: string) => {
  const lower = key.toLowerCase();
  if (lower === "cash") return { icon: faMoneyBillWave, color: "#16a34a" };
  if (lower === "credit") return { icon: faCreditCard, color: "#ea580c" };
  if (lower === "bankily" || lower === "masrivi" || lower === "sedad") return { icon: faMobileAlt, color: "#7c3aed" };
  return { icon: faHandHoldingUsd, color: "#2563eb" };
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface TaxProps extends PropsWithChildren {}

// ─── Main Component ──────────────────────────────────────────────────────────

export const SaleClosing: FC<TaxProps> = (props) => {
  const { t } = useTranslation();
  const [modal, setModal] = useState(false);
  const store = useSelector(getStore);
  const terminal = useSelector(getTerminal);

  const [payments, setPayments] = useState<{ [key: string]: number }>({});

  const useLoadHook = useApi<{
    count: number;
    list: Order[];
    payments: { [name: string]: number };
    total: number;
  }>("orders", ORDER_LIST);
  const { handleFilterChange, data, fetchData: fetchOrders } = useLoadHook;

  // ── Day closing state ────────────────────────────────────────────────────
  const [closing, setClosing] = useState<Closing>();

  const checkDayOpening = async () => {
    try {
      const queryString = QueryString.stringify({
        store: store?.id,
        terminal: terminal?.id,
      });
      const res = await jsonRequest(CLOSING_OPENED + "?" + queryString);
      const json = await res.json();
      setClosing(json.closing);
    } catch (e: any) {
      console.error("checkDayOpening error:", e);
      if (e instanceof HttpException) {
        notify({ type: "error", description: t(e.message || "An error occurred while loading data") });
      }
    }
  };

  const [title, setTitle] = useState("");
  const [hideCloseButton, setHideCloseButton] = useState(false);

  useEffect(() => {
    if (closing) {
      reset({
        openingBalance: closing.openingBalance,
        cashAdded: closing.cashAdded || 0,
        cashWithdrawn: closing.cashWithdrawn || 0,
        id: closing.id,
      });

      if (closing.openingBalance === null) {
        setModal(true);
        setHideCloseButton(true);
        setTitle(t("Start day"));
      }

      if (
        closing.openingBalance !== null &&
        DateTime.now().diff(DateTime.fromISO(closing.createdAt.datetime), "hours").hours > 24
      ) {
        setModal(true);
        setHideCloseButton(true);
        setTitle(t("Close previous day first"));
      }

      loadExpenses({ dateTimeFrom: closing.dateFrom?.datetime });

      handleFilterChange!({
        dateTimeFrom: closing.dateFrom?.datetime,
        store: store?.id,
      });
    }
  }, [closing]);

  useLayoutEffect(() => {
    checkDayOpening();
  }, []);

  useEffect(() => {
    if (modal) {
      fetchOrders();
      checkDayOpening();
    }
  }, [modal]);

  const { reset, register, handleSubmit, control, watch, getValues } = useForm();
  const [saving, setSaving] = useState(false);
  const [expenses, setExpenses] = useState(0);
  const [cashCounted, setCashCounted] = useState<number>(0);

  const user = useSelector(getAuthorizedUser);

  useEffect(() => {
    if (data?.payments) {
      setPayments(data?.payments);
    }
  }, [data]);

  // ── Expected cash in register (formerly cashInHand) ──────────────────────
  const expectedCash = useMemo(() => {
    const cash = payments["cash"] ?? 0;
    return (
      Number(watch("openingBalance")) +
      Number(watch("cashAdded")) -
      Number(watch("cashWithdrawn")) -
      expenses +
      cash
    );
  }, [payments, expenses, watch("openingBalance"), watch("cashAdded"), watch("cashWithdrawn")]);

  // Keep cashInHand as alias so onSubmit logic is not broken
  const cashInHand = expectedCash;

  // ── Variance ─────────────────────────────────────────────────────────────
  const variance = cashCounted - expectedCash;
  const showVariance = cashCounted > 0;

  // ── Total sales ──────────────────────────────────────────────────────────
  const totalSales = useMemo(
    () => Object.values(payments).reduce((sum, v) => sum + v, 0),
    [payments]
  );

  // ── Submit ───────────────────────────────────────────────────────────────
  const onSubmit = async (values: any) => {
    setSaving(true);
    try {
      if (values.openingBalance !== null) {
        values.dateTe = { datetime: DateTime.now().toISO() };
        values.closedBy = user?.id;
        values.closingBalance = cashInHand;
      } else {
        values.openingBalance = 0;
      }

      const isClosingDay =
        !values.updateOnly &&
        values.openingBalance !== null &&
        closing?.openingBalance !== null;

      if (isClosingDay) {
        const closeBody = {
          closingBalance: cashCounted > 0 ? cashCounted : cashInHand,
          denominations: null,
        };

        const response = await jsonRequest(
          CLOSING_CLOSE.replace(":id", closing?.id as string),
          {
            method: "POST",
            body: JSON.stringify(closeBody),
          }
        );
        const json = await response.json();
        setClosing(json.closing);
      } else {
        // Update only or start day — use existing endpoint
        if (!values.updateOnly) {
          values.closedAt = { datetime: DateTime.now().toISO() };
        }

        values.terminal = terminal?.id;

        const response = await jsonRequest(
          CLOSING_EDIT.replace(":id", closing?.id as string),
          {
            method: "POST",
            body: JSON.stringify(values),
          }
        );
        const json = await response.json();
        setClosing(json.closing);
      }

      setHideCloseButton(false);
      setModal(false);
    } catch (exception: any) {
      if (exception instanceof UnprocessableEntityException) {
        try {
          const e: ValidationResult = await exception.response.json();
          if (e.errorMessage) {
            notify({ type: "error", description: t(e.errorMessage) });
          }
        } catch {
          notify({ type: "error", description: t("An error occurred while loading data") });
        }
      } else if (exception instanceof HttpException) {
        notify({ type: "error", description: t(exception.message || "An error occurred while loading data") });
        // If session already closed, refresh to get new session
        await checkDayOpening();
      } else {
        console.error("Closing submit error:", exception);
        notify({ type: "error", description: t("An error occurred while loading data") });
      }
    } finally {
      setSaving(false);
    }
  };

  const loadExpenses = async (values?: any) => {
    try {
      const url = new URL(EXPENSE_LIST);
      const params = new URLSearchParams({
        ...values,
        orderBy: "id",
        orderMode: "DESC",
        store: store?.id,
      });
      url.search = params.toString();
      const json = await fetchJson(url.toString());
      const list: Expense[] = json.list;
      setExpenses(
        list.reduce((prev: number, current) => current.amount + prev, 0)
      );
    } catch (e: any) {
      console.error("loadExpenses error:", e);
      setExpenses(0);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Tooltip title={t("Day closing")}>
        <Button
          variant="primary"
          iconButton
          size="lg"
          onClick={() => {
            setModal(true);
            setTitle(t("Close day"));
            setHideCloseButton(false);
          }}
          tabIndex={-1}
        >
          <FontAwesomeIcon icon={faShopLock} />
        </Button>
      </Tooltip>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={title}
        shouldCloseOnOverlayClick={!hideCloseButton}
        hideCloseButton={hideCloseButton}
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* ══════════════════════════════════════════════════════
              SECTION 1 — Session Info
          ══════════════════════════════════════════════════════ */}
          <SectionCard title={t("Session Info")} icon={faStore} iconColor="#2563eb" muted>
            <div className="grid grid-cols-2 gap-2">
              <StatGridItem label={t("Store")} value={closing?.store?.name} />
              <StatGridItem label={t("Terminal")} value={closing?.terminal?.code} />
              <StatGridItem label={t("Day started by")} value={closing?.openedBy?.displayName} />
              <StatGridItem
                label={t("Day started at")}
                value={
                  closing?.createdAt?.datetime
                    ? DateTime.fromISO(closing.createdAt.datetime).toFormat(
                        import.meta.env.VITE_DATE_TIME_FORMAT as string
                      )
                    : null
                }
              />
            </div>
          </SectionCard>

          {/* ══════════════════════════════════════════════════════
              SECTION 2 — Cash Flow
          ══════════════════════════════════════════════════════ */}
          <SectionCard title={t("Cash Flow")} icon={faCashRegister} iconColor="#0891b2">
            <FormRow label={t("Opening balance")}>
              <Controller
                render={(props) => (
                  <KeyboardInput
                    className="w-full"
                    type="number"
                    defaultValue={props.field.value}
                    value={props.field.value}
                    onChange={props.field.onChange}
                  />
                )}
                name="openingBalance"
                control={control}
              />
            </FormRow>

            <FormRow label={t("Cash added")}>
              <Input
                {...register("cashAdded", { valueAsNumber: true })}
                type="number"
                className="w-full"
                tabIndex={0}
                selectable={true}
              />
            </FormRow>

            {closing?.openingBalance !== null && (
              <>
                <FormRow
                  label={t("Expenses")}
                  hint={t("click on expenses button to add expenses")}
                >
                  <Controller
                    control={control}
                    name="expenses"
                    render={(props) => (
                      <Input
                        {...register("expenses", { valueAsNumber: true })}
                        type="number"
                        className="w-full"
                        value={expenses.toString()}
                        onChange={props.field.onChange}
                        readOnly
                        selectable={true}
                      />
                    )}
                  />
                </FormRow>

                <FormRow label={t("Cash withdrawn")}>
                  <Input
                    {...register("cashWithdrawn", { valueAsNumber: true })}
                    type="number"
                    className="w-full"
                    tabIndex={0}
                    selectable={true}
                  />
                </FormRow>
              </>
            )}
          </SectionCard>

          {/* ══════════════════════════════════════════════════════
              SECTION 3 — Sales Summary (only when day is active)
          ══════════════════════════════════════════════════════ */}
          {closing?.openingBalance !== null && Object.keys(payments).length > 0 && (
            <SectionCard title={t("Sales Summary")} icon={faReceipt} iconColor="#16a34a">
              <div className="flex flex-col gap-2">
                {Object.keys(payments).map((paymentType) => {
                  const { icon, color } = getPaymentIcon(paymentType);
                  return (
                    <div
                      key={paymentType}
                      className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{
                        background: "var(--pos-surface, #f8f9fb)",
                        border: "1px solid var(--pos-border, #e5e7eb)",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="flex items-center justify-center w-7 h-7 rounded-full"
                          style={{ background: color + "18" }}
                        >
                          <FontAwesomeIcon icon={icon} className="text-xs" style={{ color }} />
                        </span>
                        <span className="text-[13px] font-medium text-gray-700">
                          {paymentType.charAt(0).toUpperCase() + paymentType.slice(1)}{" "}
                          {t("sale")}
                        </span>
                      </div>
                      <span className="text-[13px] font-bold text-gray-900 tabular-nums">
                        {withCurrency(payments[paymentType])}
                      </span>
                      {/* Hidden input to preserve form data */}
                      <input
                        type="hidden"
                        {...register(`data.${paymentType}`)}
                        value={payments[paymentType]}
                      />
                    </div>
                  );
                })}

                {/* Total sales row */}
                <div
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg mt-1"
                  style={{
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                  }}
                >
                  <span className="text-[13px] font-semibold text-green-800">{t("Total sales")}</span>
                  <span className="text-[15px] font-bold text-green-700 tabular-nums">
                    {withCurrency(totalSales)}
                  </span>
                </div>
              </div>
            </SectionCard>
          )}

          {/* ══════════════════════════════════════════════════════
              SECTION 4 — Cash Reconciliation (only when day is active)
          ══════════════════════════════════════════════════════ */}
          {closing?.openingBalance !== null && (
            <SectionCard title={t("Cash Reconciliation")} icon={faCalculator} iconColor="#7c3aed">
              {/* Expected cash equation display */}
              <div
                className="flex flex-wrap items-center gap-1.5 px-3 py-2.5 rounded-lg mb-3 text-[12px] text-gray-500"
                style={{
                  background: "var(--pos-surface, #f8f9fb)",
                  border: "1px solid var(--pos-border, #e5e7eb)",
                }}
              >
                <span className="font-medium text-gray-600">{t("Opening balance")}</span>
                <FontAwesomeIcon icon={faArrowUp} className="text-green-500 text-[10px]" />
                <span className="font-medium text-gray-600">{t("Cash added")}</span>
                <FontAwesomeIcon icon={faArrowDown} className="text-red-400 text-[10px]" />
                <span className="font-medium text-gray-600">{t("Cash withdrawn")}</span>
                <FontAwesomeIcon icon={faArrowDown} className="text-red-400 text-[10px]" />
                <span className="font-medium text-gray-600">{t("Expenses")}</span>
                <FontAwesomeIcon icon={faArrowUp} className="text-green-500 text-[10px]" />
                <span className="font-medium text-gray-600">{t("Cash sales")}</span>
              </div>

              {/* Expected cash value */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] text-gray-600 font-medium">{t("Expected cash")}</span>
                <span
                  className={classNames(
                    "text-[16px] font-bold tabular-nums",
                    expectedCash < 0 ? "text-red-500" : "text-gray-900"
                  )}
                >
                  {withCurrency(expectedCash)}
                </span>
              </div>

              {/* Divider */}
              <div
                className="mb-3"
                style={{ borderTop: "1px dashed var(--pos-border, #e5e7eb)" }}
              />

              {/* Cash counted input */}
              <FormRow label={t("Cash counted")}>
                <Input
                  type="number"
                  min={0}
                  className="w-full"
                  value={cashCounted === 0 ? "" : cashCounted.toString()}
                  placeholder="0"
                  onChange={(e) =>
                    setCashCounted(parseFloat(e.target.value) || 0)
                  }
                  tabIndex={0}
                  selectable={true}
                />
              </FormRow>

              {/* Variance display */}
              {showVariance && (
                <div
                  className={classNames(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg",
                    variance >= 0
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {variance < 0 && (
                      <FontAwesomeIcon
                        icon={faExclamationTriangle}
                        className="text-red-500 text-xs"
                      />
                    )}
                    <span
                      className={classNames(
                        "text-[13px] font-semibold",
                        variance >= 0 ? "text-green-700" : "text-red-700"
                      )}
                    >
                      {t("Variance")}
                      {" — "}
                      <span className="font-normal text-[12px]">
                        {variance >= 0 ? t("Surplus") : t("Deficit")}
                      </span>
                    </span>
                  </div>
                  <span
                    className={classNames(
                      "text-[15px] font-bold tabular-nums",
                      variance >= 0 ? "text-green-700" : "text-red-600"
                    )}
                  >
                    {variance >= 0 ? "+" : ""}
                    {withCurrency(variance)}
                  </span>
                </div>
              )}
            </SectionCard>
          )}

          {/* ══════════════════════════════════════════════════════
              SECTION 5 — Actions
          ══════════════════════════════════════════════════════ */}
          <div className="mt-4">
            {closing?.openingBalance !== null && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-4 text-[12px] text-blue-700"
                style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}
              >
                <span>{t("Click on Update button if you are only saving the closing.")}</span>
              </div>
            )}

            <div className="flex gap-3 items-center justify-center flex-wrap">
              {/* Update / Start day button */}
              <Button
                onClick={() => {
                  reset({
                    ...getValues(),
                    updateOnly: true,
                  });
                }}
                type="submit"
                variant="primary"
                tabIndex={0}
                disabled={saving}
              >
                {saving
                  ? "..."
                  : closing?.openingBalance === null
                  ? t("Start day")
                  : t("Update")}
              </Button>

              {/* Close day button */}
              {closing?.openingBalance !== null && (
                <Button type="submit" variant="primary" tabIndex={0} disabled={saving}>
                  {saving ? "..." : t("Close day")}
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* Expenses button (standalone modal, stays outside the form) */}
        <div className="text-center mt-4">
          <Expenses
            onClose={() =>
              loadExpenses({ dateTimeFrom: closing?.dateFrom?.datetime })
            }
          />
        </div>
      </Modal>
    </>
  );
};
