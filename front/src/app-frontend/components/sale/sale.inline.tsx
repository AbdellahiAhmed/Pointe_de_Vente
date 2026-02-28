import { Button } from "../../../app-common/components/input/button";
import React, { FC, useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { OrderTotals } from "../cart/order.totals";
import { Textarea } from "../../../app-common/components/input/textarea";
import { Controller, useForm } from "react-hook-form";
import { jsonRequest } from "../../../api/request/request";
import { ORDER_CREATE, ORDER_EDIT, } from "../../../api/routing/routes/backend.app";
import { PaymentType } from "../../../api/model/payment.type";
import classNames from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPause, faPlus, faTrash,
  faMoneyBillWave, faMobileAlt, faCreditCard, faHandHoldingUsd,
  faCheck, faTimes, faWallet, faPrint, faUndo,
} from "@fortawesome/free-solid-svg-icons";
import { OrderPayment } from "../../../api/model/order.payment";
import { UnprocessableEntityException } from "../../../lib/http/exception/http.exception";
import { ValidationResult } from "../../../lib/validator/validation.result";
import { Shortcut } from "../../../app-common/components/input/shortcut";
import { ClearSale } from "./clear.sale";
import { PrintOrder } from "./sale.print";
import { useSelector } from "react-redux";
import { getStore } from "../../../duck/store/store.selector";
import { getTerminal } from "../../../duck/terminal/terminal.selector";
import { notify } from "../../../app-common/components/confirm/notification";
import { withCurrency } from "../../../lib/currency/currency";
import { useAtom } from "jotai";
import { CartItemType } from "../cart/cart.container";
import { defaultData, defaultState, PosModes } from "../../../store/jotai";
import { discountTotal, finalTotal, taxTotal } from "../../containers/dashboard/pos";
import { Order, OrderStatus } from "../../../api/model/order";
import {useTranslation} from "react-i18next";
import { notification, Tooltip } from "antd";
import { faBan } from "@fortawesome/free-solid-svg-icons";
import { CreditCustomerModal } from "../customers/credit-customer-modal";

interface Props {
  paymentTypesList: PaymentType[];
  isInline?: boolean;
  saleModal?: boolean;
  setSaleModal?: (state: boolean) => void;
  onSale?: () => void;
}

export const CloseSaleInline: FC<Props> = ({
  paymentTypesList,
  isInline,
  saleModal,
  setSaleModal,
  onSale,
}) => {
  const {t} = useTranslation();
  const [appState, setAppState] = useAtom(defaultState);
  const {
    added,
    discount,
    tax,
    customer,
    refundingFrom,
    discountRateType,
    adjustment,
    orderId,
    customerName, discountAmount
  } = appState;

  const ft = finalTotal(added, tax, discountAmount, discountRateType, discount);

  const { register, handleSubmit, watch, reset, control, getValues } =
    useForm();

  const [defaultAppState, setDefaultAppState] = useAtom(defaultData);

  const { defaultMode, defaultDiscount, defaultPaymentType, defaultTax, requireCustomerBox, autoPrintReceipt } =
    defaultAppState;

  const [isSaleClosing, setSaleClosing] = useState(false);
  const isSubmittingRef = useRef(false);
  const [payment, setPayment] = useState<PaymentType>();
  const [payments, setPayments] = useState<OrderPayment[]>([]);
  const [hold, setHold] = useState(false);
  const [quickCashOperation, setQuickCashOperation] = useState<
    "add" | "subtract" | "exact"
  >("exact");
  const [quickCashItems, setQuickCashItems] = useState<number[]>([
    5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1,
  ]);

  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [pendingCreditPayment, setPendingCreditPayment] = useState<PaymentType | null>(null);

  const store = useSelector(getStore);
  const terminal = useSelector(getTerminal);

  const isReturnMode = !!refundingFrom;

  const showSaleSuccess = useCallback((order: Order, wasReturn?: boolean) => {
    setLastOrder(order);

    // Auto-print receipt if enabled in settings
    if (autoPrintReceipt) {
      PrintOrder(order);
    }

    notification.success({
      message: wasReturn ? t("Return completed") : t("Sale completed"),
      description: `${t("Receipt #")}${order.orderId} — ${withCurrency(
        Math.abs(order.payments.reduce((sum, p) => sum + p.received, 0))
      )}`,
      placement: "bottomRight",
      duration: 4,
      btn: !autoPrintReceipt ? (
        <button
          type="button"
          className="sale-toast-print"
          onClick={() => {
            PrintOrder(order);
            notification.destroy("sale-success");
          }}>
          <FontAwesomeIcon icon={faPrint} className="me-1" />
          {t("Print")}
        </button>
      ) : undefined,
      key: "sale-success",
    });
  }, [t, autoPrintReceipt]);

  const resetFields = () => {
    setAppState((prev) => ({
      ...prev,
      added: [],
      customer: undefined,
      adjustment: 0,
      refundingFrom: undefined,
      customerName: '',
      cartItem: undefined,
      cartItemType: CartItemType.quantity,
      latest: undefined,
      quantity: 1,
      q: "",
      orderId: undefined,
      latestQuantity: undefined,
      latestRate: undefined,
      latestVariant: undefined,
    }));

    if( typeof setSaleModal === 'function' ) {
      setSaleModal(false);
    }
    reset({
      received: undefined,
    });

    if( defaultPaymentType ) {
      setPayment(defaultPaymentType);
    } else {
      setPayment(undefined);
    }

    if( defaultDiscount ) {
      setAppState((prev) => ({
        ...prev,
        discount: defaultDiscount,
      }));
    } else {
      setAppState((prev) => ({
        ...prev,
        discount: undefined,
        discountAmount: undefined,
      }));
    }

    //set default options
    if( defaultTax ) {
      setAppState((prev) => ({
        ...prev,
        tax: defaultTax,
      }));
    } else {
      setAppState((prev) => ({
        ...prev,
        tax: undefined,
      }));
    }

    setHold(false);
  };

  const onSaleSubmit = async (values: any) => {
    // Prevent double-submit with ref guard (instant, no re-render delay)
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    let paymentsAdded: OrderPayment[] = [...payments];
    if(requireCustomerBox && !customerName){
      notify({
        type: "error",
        description: t('Add customer name'),
        placement: 'topRight'
      });
      isSubmittingRef.current = false;
      return ;
    }
    setSaleClosing(true);
    if( payments.length === 0 ) {
      paymentsAdded = [
        {
          received: values.received,
          type: payment,
          total: ft + adjustment,
          due: changeDue,
        },
      ];
    }
    const creditPayments = paymentsAdded.filter(p => p.type?.type === 'credit');
    if (creditPayments.length > 0 && customer) {
      const totalCredit = creditPayments.reduce((sum, p) => sum + Number(p.received), 0);
      if (!customer.allowCreditSale) {
        notify({ type: 'error', description: t('Credit sales not allowed for this customer') });
        setSaleClosing(false);
        isSubmittingRef.current = false;
        return;
      }
      if (customer.creditLimit && Number(customer.creditLimit) > 0) {
        const currentDebt = customer.outstanding;
        if (currentDebt + totalCredit > Number(customer.creditLimit)) {
          notify({ type: 'error', description: t('Credit limit exceeded') });
          setSaleClosing(false);
          isSubmittingRef.current = false;
          return;
        }
      }
    }
    try {
      const formValues: any = {
        items: added,
        discount: discount,
        tax: tax,
        taxAmount: taxTotal(added),
        payments: paymentsAdded,
        customerId: customer?.id,
        customer: customer?.id ? undefined : customerName,
        discountAmount: discountTotal(added, tax, discountAmount, discountRateType, discount),
        discountRateType: discountRateType,
        refundingFrom: refundingFrom,
        notes: values.notes,
        store: store?.id,
        total: ft,
        terminal: terminal?.id,
        adjustment: adjustment,
      };

      if( hold ) {
        formValues["isSuspended"] = true;
      }

      if( defaultMode === PosModes.order ) {
        formValues["status"] = OrderStatus.PENDING;
      } else {
        formValues["status"] = OrderStatus.COMPLETED;
      }

      let url = ORDER_CREATE;
      let method = 'POST';
      if( orderId ) {
        url = ORDER_EDIT.replace(":id", orderId);
        method = 'PUT';
      }
      const response = await jsonRequest(url, {
        method: method,
        body: JSON.stringify(formValues),
      });

      const json = await response.json();

      if( json.order && (json.order.status === OrderStatus.COMPLETED || json.order.status === OrderStatus.ON_HOLD || json.order.isSuspended) ) {
        resetFields();
        setPayments([]);

        if( json.order.isSuspended ) {
          notify({ type: 'success', description: t('Order placed on hold') });
        } else if( json.order.status === OrderStatus.COMPLETED ) {
          onSale && onSale();
          // Show success toast with optional print
          showSaleSuccess(json.order, !!refundingFrom);
        }
      }
    } catch ( e: any ) {
      if( e instanceof UnprocessableEntityException ) {
        const res: ValidationResult = await e.response.json();

        const message = res.errorMessage;
        const messages = (res.violations || []).map((validation) => {
          return `${validation.message}`;
        });

        if( message ) {
          notify({
            type: "error",
            description: message,
          });
        }

        if( messages.length > 0 ) {
          notify({
            type: "error",
            description: messages.join(", "),
          });
        }
      } else {
        notify({
          type: "error",
          description: e?.message || t("An error occurred while processing the sale"),
        });
      }
    } finally {
      setSaleClosing(false);
      isSubmittingRef.current = false;
      // Always clear refundingFrom to prevent stale state from blocking subsequent sales
      if (refundingFrom) {
        setAppState((prev) => ({ ...prev, refundingFrom: undefined }));
      }
    }
  };

  const receivedValue = watch("received") ?? 0;
  const changeDue = useMemo(() => {
    //get a total of payments
    if( payments.length === 0 ) {
      return Number(receivedValue) - ft + adjustment;
    }

    return (
      payments.reduce(
        (prev, current) => Number(prev) + Number(current.received),
        0
      ) -
      ft +
      adjustment
    );
  }, [payments, receivedValue, adjustment, ft]);

  useEffect(() => {
    if( payment === undefined ) {
      //check for default payment
      if( defaultPaymentType ) {
        setPayment(defaultPaymentType);
      } else {
        if( paymentTypesList.length > 0 ) {
          setPayment(paymentTypesList[0]);
        }
      }
    }
  }, [paymentTypesList, payment, saleModal]);

  useEffect(() => {
    if( payments.length === 0 && saleModal ) {
      if( defaultPaymentType ) {
        addSplitPayment(ft, defaultPaymentType);
      }
    }
  }, [saleModal, defaultPaymentType]);

  const received = useMemo(() => {
    return Number(
      payments.reduce(
        (prev, current) => Number(prev) + Number(current.received),
        0
      )
    );
  }, [payments]);

  useEffect(() => {
    reset({
      received: (ft + adjustment).toFixed(2),
    });
  }, [adjustment, ft]);

  const addQuickCash = useCallback(
    (item: number, cashOperation?: string) => {
      let method = cashOperation || quickCashOperation;

      if( method === "exact" ) {
        addSplitPayment(item, payment);
      } else if( method === "add" ) {
        addSplitPayment(item, payment);
      } else if( method === "subtract" ) {
        addSplitPayment(-item, payment);
      }
    },
    [quickCashOperation, reset, finalTotal, payments, payment]
  );

  const shortcutHandler = useCallback(
    (e: Event) => {
      //open sale modal
      // if (added.length > 0) {
      //   if (setSaleModal) {
      //     setSaleModal!(true);
      //   }
      // }

      // if (saleModal) {
      //   //close sale
      //   onSaleSubmit(getValues());
      // }

      const hasError = changeDue < 0 || isSaleClosing || added.length === 0;

      if( isInline && !hasError ) {
        onSaleSubmit(getValues());
      }
    },
    [
      added,
      saleModal,
      payments,
      hold,
      tax,
      customer,
      discount,
      finalTotal,
      discountTotal,
      discountRateType,
      refundingFrom,
      getValues,
      isInline,
      payment,
      changeDue,
      customerName
    ]
  );

  const addSplitPayment = (amount: number, payment?: PaymentType) => {
    if( amount === 0 ) {
      notify({
        type: "error",
        description: t("Amount cannot be zero"),
      });

      return false;
    }

    if( !payment?.canHaveChangeDue && amount + received > ft ) {
      notify({
        type: "error",
        description: t("Please add exact amount for {{name}}", { name: payment?.name }),
      });

      return false;
    }

    const prevPayments = [...payments];
    const prevReceived = prevPayments.reduce(
      (sum, p) => sum + Number(p.received),
      0
    );
    const remaining = ft - prevReceived;
    const changeDueForThis = amount > remaining ? amount - remaining : 0;
    prevPayments.push({
      total: Math.min(amount, remaining),
      received: amount,
      due: changeDueForThis,
      type: payment,
    });

    setPayments(prevPayments);

    reset({
      received:
        ft -
        prevPayments.reduce(
          (prev, current) => Number(prev) + Number(current.received),
          0
        ),
    });
  };

  const removeSplitPayment = (item: number) => {
    const prevPayments = [...payments];

    prevPayments.splice(item, 1);

    setPayments(prevPayments);

    reset({
      received:
        ft -
        prevPayments.reduce(
          (prev, current) => Number(prev) + Number(current.received),
          0
        ),
    });
  };

  const getQuickCashCounter = (amount: number) => {
    return payments.filter((item) => Number(item.received) === amount).length;
  };

  const focusAmountField = () => {
    selectPaymentInput();
  };

  const addAdjustment = () => {
    const adj = ft % 10;

    if( adj < 5 ) {
      setAppState((prev) => ({
        ...prev,
        adjustment: -adj,
      }));
    } else {
      setAppState((prev) => ({
        ...prev,
        adjustment: 10 - adj,
      }));
    }
  };

  const canAdjust = useMemo(() => {
    return ft % 10 !== 0;
  }, [ft]);

  const paymentInputRef = useRef<HTMLInputElement>(null);
  const selectPaymentInput = () => {
    if( paymentInputRef.current !== null ) {
      paymentInputRef.current.select();
    }
  };

  const getPaymentIcon = (type: string) => {
    switch (type) {
      case "cash": return faMoneyBillWave;
      case "credit": return faHandHoldingUsd;
      case "card": return faCreditCard;
      case "mobile": return faWallet;
      default: return faMobileAlt;
    }
  };

  return (
    <>
      <div className="mb-5">
        <div className="grid grid-cols-6 gap-4">
          <div className={classNames(isInline ? "col-span-6" : "col-span-4")}>
            <OrderTotals
              inSale={true}>
              {!!adjustment && (
                <tr>
                  <th
                    className={classNames(
                      `border border-gray-300 p-2 text-start text-3xl font-bold digital bg-black`,
                      ft % 10 < 5
                        ? "text-danger-500"
                        : " text-success-500"
                    )}>
                    {t("Adjustment")}
                  </th>
                  <td
                    className={classNames(
                      `border border-gray-300 p-2 text-end text-3xl font-bold digital bg-black`,
                      ft % 10 < 5
                        ? "text-danger-500"
                        : " text-success-500"
                    )}>
                    {withCurrency(adjustment)}
                  </td>
                </tr>
              )}
              <tr>
                <th
                  className={classNames(
                    `border border-gray-300 p-2 text-start text-3xl font-bold digital bg-black`,
                    changeDue < 0 ? "text-danger-500" : " text-success-500"
                  )}>
                  {changeDue < 0 ? t("Receivable") : t("Change Due")}
                </th>
                <td
                  className={classNames(
                    `border border-gray-300 p-2 text-end text-3xl font-bold digital bg-black`,
                    changeDue < 0 ? "text-danger-500" : " text-success-500"
                  )}>
                  {withCurrency(changeDue)}
                </td>
              </tr>
            </OrderTotals>
          </div>
          {!isInline && (
            <div className="col-span-2">
              <div className="grid grid-cols-3 gap-4">
                <Button
                  className="btn-secondary"
                  size="lg"
                  active={quickCashOperation === "exact"}
                  onClick={() => setQuickCashOperation("exact")}>
                  {t("Exact")}
                </Button>
                <Button
                  className="btn-secondary"
                  size="lg"
                  active={quickCashOperation === "add"}
                  onClick={() => setQuickCashOperation("add")}>
                  {t("Add")}
                </Button>
                <Button
                  className="btn-secondary"
                  size="lg"
                  active={quickCashOperation === "subtract"}
                  onClick={() => setQuickCashOperation("subtract")}>
                  {t("Subtract")}
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-4">
                {quickCashItems.map((item) => (
                  <Button
                    className="w-full btn-warning relative"
                    size="lg"
                    key={item}
                    onClick={() => addQuickCash(item)}>
                    {item}
                    {getQuickCashCounter(item) > 0 && (
                      <span className="quick-cash-badge">
                        {getQuickCashCounter(item)}
                      </span>
                    )}
                  </Button>
                ))}
                <Button
                  className="w-full btn-primary"
                  size="lg"
                  key={ft}
                  onClick={() => addQuickCash(ft, "exact")}>
                  {ft.toFixed(2)}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      {customer && (defaultMode === PosModes.payment || defaultMode === PosModes.pos) && (
        customer.allowCreditSale ? (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-2 text-sm">
            <span className="text-amber-800">
              {t('Outstanding')}: <strong>{withCurrency(customer.outstanding)}</strong>
            </span>
            {customer.creditLimit && Number(customer.creditLimit) > 0 && (
              <span className="text-amber-800">
                {t('Limit')}: <strong>{withCurrency(Number(customer.creditLimit))}</strong>
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded px-3 py-2 mb-2 text-sm">
            <FontAwesomeIcon icon={faBan} className="text-red-400" />
            <span className="text-red-700 font-semibold">{t('Credit not authorized for this customer')}</span>
          </div>
        )
      )}
      {/* ═══ Return Mode Banner ═══ */}
      {isReturnMode && (
        <div className="return-mode-banner">
          <FontAwesomeIcon icon={faUndo} className="me-2" />
          <span>{t("Return Mode")} — {t("Order #")}{refundingFrom}</span>
        </div>
      )}

      {/* ═══ Payment Section ═══ */}
      <form onSubmit={handleSubmit(onSaleSubmit)}>
        {(defaultMode === PosModes.payment || defaultMode === PosModes.pos) && (
          <>
            {/* Payment method grid */}
            <div className="pay-grid">
              {paymentTypesList.map((pt, index) => {
                const isActive = payment?.id === pt.id;
                const isCreditType = pt.type === "credit";
                const noCustomer = customer === undefined || customer === null;
                const creditNotAllowed = isCreditType && !noCustomer && !customer.allowCreditSale;
                const creditLimitExceeded = isCreditType && !noCustomer && customer.allowCreditSale &&
                  customer.creditLimit && Number(customer.creditLimit) > 0 &&
                  (customer.outstanding + ft) > Number(customer.creditLimit);
                // Build tooltip reason for blocked credit (not for "no customer" — modal handles that)
                let creditTooltip = "";
                if (isCreditType && added.length > 0) {
                  if (creditNotAllowed) creditTooltip = t("Credit not authorized for this customer");
                  else if (creditLimitExceeded) creditTooltip = t("Credit limit exceeded");
                }

                const handlePaymentClick = () => {
                  if (isCreditType && noCustomer && added.length > 0) {
                    // Open credit customer modal instead of blocking
                    setPendingCreditPayment(pt);
                    setShowCreditModal(true);
                    return;
                  }
                  setPayment(pt);
                };

                const tileDisabled = (isCreditType && (creditNotAllowed || creditLimitExceeded)) || added.length === 0;

                const tile = (
                  <button
                    key={index}
                    onClick={handlePaymentClick}
                    type="button"
                    disabled={tileDisabled}
                    className={classNames("pay-tile", {
                      "pay-tile--active": isActive,
                      "pay-tile--blocked": creditNotAllowed || creditLimitExceeded,
                    })}>
                    <FontAwesomeIcon icon={getPaymentIcon(pt.type)} className="pay-tile__icon" />
                    <span className="pay-tile__name">{pt.name}</span>
                    {isActive && <span className="pay-tile__check"><FontAwesomeIcon icon={faCheck} /></span>}
                    {creditNotAllowed && <FontAwesomeIcon icon={faBan} className="pay-tile__blocked-icon" />}
                    {isCreditType && !noCustomer ? (
                      <Shortcut shortcut={`alt+p+${index}`} handler={() => !tileDisabled && setPayment(pt)} />
                    ) : !isCreditType ? (
                      <Shortcut shortcut={`alt+p+${index}`} handler={() => setPayment(pt)} />
                    ) : null}
                  </button>
                );

                return creditTooltip ? (
                  <Tooltip key={index} title={creditTooltip} placement="top">{tile}</Tooltip>
                ) : tile;
              })}
            </div>

            {/* Amount input + Add button */}
            <div className="pay-amount-row">
              <Controller
                name="received"
                control={control}
                render={(props) => (
                  <input
                    ref={paymentInputRef}
                    onChange={props.field.onChange}
                    value={props.field.value}
                    type="number"
                    id="amount"
                    placeholder={t("Payment")}
                    className="pay-amount-input mousetrap"
                    onClick={selectPaymentInput}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSplitPayment(Number(watch("received")), payment);
                        return false;
                      }
                    }}
                    disabled={added.length === 0}
                    tabIndex={0}
                  />
                )}
                defaultValue={ft + adjustment}
              />
              <Shortcut actionId="focus_payment" handler={() => focusAmountField()} invisible={true} />
              <button
                type="button"
                className="pay-add-btn"
                onClick={() => addSplitPayment(Number(watch("received")), payment)}
                disabled={added.length === 0}
                tabIndex={-1}>
                <FontAwesomeIcon icon={faPlus} className="me-1" />
                {t("Add")}
              </button>
            </div>

            {/* Split payments list */}
            {payments.length > 0 && (
              <div className="pay-splits">
                {payments.map((item, index) => (
                  <div className={classNames("pay-splits__row", isReturnMode && "pay-splits__row--return")} key={index}>
                    <span className="pay-splits__label">
                      {isReturnMode ? t("Refund via") + " " : ""}{item?.type?.name}
                    </span>
                    <span className="pay-splits__val">{withCurrency(Math.abs(Number(item.received)))}</span>
                    <button
                      className="pay-splits__del"
                      type="button"
                      onClick={() => removeSplitPayment(index)}>
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                ))}
                <div className="pay-splits__remaining">
                  {t("Remaining")}: <strong>{withCurrency(Math.abs(Math.max(0, ft - received + adjustment)))}</strong>
                </div>
              </div>
            )}

            {/* Adjustment */}
            {canAdjust && (
              <div style={{ marginBottom: "4px" }}>
                {!!adjustment ? (
                  <button
                    type="button"
                    className="pay-adjust pay-adjust--active"
                    disabled={added.length === 0}
                    tabIndex={-1}
                    onClick={() => { setAppState((prev) => ({ ...prev, adjustment: 0 })); }}>
                    <FontAwesomeIcon icon={faTrash} className="me-1" />
                    {t("Adjustment")}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="pay-adjust"
                    disabled={added.length === 0}
                    tabIndex={-1}
                    onClick={addAdjustment}>
                    {t("Add Adjustment")}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Notes */}
        <Textarea
          {...register("notes")}
          className="pay-notes"
          id="notes"
          placeholder={t("Notes")}
          tabIndex={-1}
          rows={1}
        />

        {/* Action buttons */}
        <div className="pay-actions">
          <button
            className={isReturnMode ? "pay-btn-return" : "pay-btn-confirm"}
            type="submit"
            disabled={added.length === 0 || isSaleClosing || changeDue < 0}
            tabIndex={0}>
            <FontAwesomeIcon icon={isReturnMode ? faUndo : faCheck} className="me-1" />
            {isSaleClosing ? "..." : isReturnMode ? t("Confirm Return") : t("Done")}
            <Shortcut actionId="settle_order" handler={shortcutHandler} />
          </button>
          {!isReturnMode && (
            <button
              type="submit"
              disabled={added.length === 0 || isSaleClosing}
              className="pay-btn-hold"
              onClick={() => setHold(true)}>
              <FontAwesomeIcon icon={faPause} />
            </button>
          )}
          <div className="pay-btn-cancel">
            <ClearSale />
          </div>
        </div>
      </form>

      {/* Credit customer selection modal */}
      <CreditCustomerModal
        open={showCreditModal}
        onClose={() => {
          setShowCreditModal(false);
          setPendingCreditPayment(null);
        }}
        onCustomerSelected={(c) => {
          // Capture credit payment type before clearing state
          const creditPt = pendingCreditPayment;
          // Close modal and clear pending state
          setShowCreditModal(false);
          setPendingCreditPayment(null);
          // Set customer
          setAppState(prev => ({
            ...prev,
            customer: c,
            customerName: c.name,
          }));
          // Auto-select the credit payment type after customer is chosen
          if (creditPt) {
            setPayment(creditPt);
          }
        }}
      />
    </>
  );
};
