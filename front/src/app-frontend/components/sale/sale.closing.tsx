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
import { faShopLock } from "@fortawesome/free-solid-svg-icons";
import { Tooltip } from "antd";
import useApi from "../../../api/hooks/use.api";
import { Order } from "../../../api/model/order";
import { withCurrency } from "../../../lib/currency/currency";
import {useTranslation} from "react-i18next";

const MRU_DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 1] as const;

interface TaxProps extends PropsWithChildren {

}

export const SaleClosing: FC<TaxProps> = (props) => {
  const {t} = useTranslation();
  const [modal, setModal] = useState(false);
  const store = useSelector(getStore);
  const terminal = useSelector(getTerminal);

  const [payments, setPayments] = useState<{ [key: string]: number }>({});

  const useLoadHook = useApi<{
    count: number,
    list: Order[],
    payments: { [name: string]: number },
    total: number
  }>('orders', ORDER_LIST);
  const { handleFilterChange, data, fetchData: fetchOrders } = useLoadHook;

  //check for day closing
  const [closing, setClosing] = useState<Closing>();
  const checkDayOpening = async () => {
    try {
      const queryString = QueryString.stringify({
        store: store?.id,
        terminal: terminal?.id
      })

      const res = await jsonRequest(CLOSING_OPENED + '?' + queryString);
      const json = await res.json();

      setClosing(json.closing);

    } catch ( e ) {
      throw e;
    }
  };

  const [title, setTitle] = useState('');
  const [hideCloseButton, setHideCloseButton] = useState(false);

  useEffect(() => {
    if( closing ) {
      reset({
        openingBalance: closing.openingBalance,
        cashAdded: closing.cashAdded || 0,
        cashWithdrawn: closing.cashWithdrawn || 0,
        id: closing.id
      });

      if( closing.openingBalance === null ) {
        setModal(true);
        setHideCloseButton(true);
        setTitle(t('Start day'));
      }

      if( closing.openingBalance !== null && DateTime.now().diff(DateTime.fromISO(closing.createdAt.datetime), 'hours').hours > 24 ) {
        setModal(true);
        setHideCloseButton(true);
        setTitle(t('Close previous day first'));
      }

      loadExpenses({
        dateTimeFrom: closing.dateFrom?.datetime
      });

      handleFilterChange!({
        dateTimeFrom: closing.dateFrom?.datetime,
        store: store?.id
      });
    }
  }, [closing]);

  useLayoutEffect(() => {
    checkDayOpening();
  }, []);

  useEffect(() => {
    if( modal ) {
      fetchOrders();
      checkDayOpening();
    }
  }, [modal]);

  const { reset, register, handleSubmit, control, watch, getValues } = useForm();
  const [saving, setSaving] = useState(false);
  const [expenses, setExpenses] = useState(0);
  const [denomCounts, setDenomCounts] = useState<Record<number, number>>(
    () => Object.fromEntries(MRU_DENOMINATIONS.map(d => [d, 0]))
  );

  const denomTotal = useMemo(() => {
    return MRU_DENOMINATIONS.reduce((sum, d) => sum + d * (denomCounts[d] || 0), 0);
  }, [denomCounts]);

  const user = useSelector(getAuthorizedUser);

  useEffect(() => {
    if( data?.payments ) {
      setPayments(data?.payments);
    }
  }, [data]);

  const onSubmit = async (values: any) => {
    setSaving(true);
    try {
      if( values.openingBalance !== null ) {
        values.dateTe = {
          datetime: DateTime.now().toISO()
        }

        values.closedBy = user?.id;
        values.closingBalance = cashInHand;
      } else {
        values.openingBalance = 0;
      }

      const isClosingDay = !values.updateOnly && values.openingBalance !== null && closing?.openingBalance !== null;

      if (isClosingDay) {
        // Use the new close endpoint with denominations
        const denominations = MRU_DENOMINATIONS
          .filter(d => (denomCounts[d] || 0) > 0)
          .map(d => ({
            value: d,
            count: denomCounts[d] || 0,
            total: d * (denomCounts[d] || 0),
          }));

        const closeBody = {
          closingBalance: denomTotal > 0 ? denomTotal : cashInHand,
          denominations: denominations.length > 0 ? denominations : null,
        };

        const response = await jsonRequest(CLOSING_CLOSE.replace(':id', closing?.id as string), {
          method: 'POST',
          body: JSON.stringify(closeBody)
        });
        const json = await response.json();

        setClosing(json.closing);
      } else {
        // Update only or start day — use existing endpoint
        if( !values.updateOnly ) {
          values.closedAt = {
            datetime: DateTime.now().toISO()
          }
        }

        values.terminal = terminal?.id;

        const response = await jsonRequest(CLOSING_EDIT.replace(':id', closing?.id as string), {
          method: 'POST',
          body: JSON.stringify(values)
        });
        const json = await response.json();

        setClosing(json.closing);
      }

      setHideCloseButton(false);
      setModal(false);

    } catch ( exception ) {
      if( exception instanceof HttpException ) {
        if( exception.message ) {
          notify({
            type: 'error',
            description: exception.message
          });
        }
      }

      if( exception instanceof UnprocessableEntityException ) {
        const e: ValidationResult = await exception.response.json();
        if( e.errorMessage ) {
          notify({
            type: 'error',
            description: e.errorMessage
          });
        }

        return false;
      }
      throw exception;
    } finally {
      setSaving(false);
    }
  };

  const loadExpenses = async (values?: any) => {
    try {
      const url = new URL(EXPENSE_LIST);
      const params = new URLSearchParams({
        ...values,
        orderBy: 'id',
        orderMode: 'DESC',
        store: store?.id
      });

      url.search = params.toString();
      const json = await fetchJson(url.toString());

      const list: Expense[] = json.list;

      setExpenses(list.reduce((prev: number, current) => {
        return current.amount + prev
      }, 0));

    } catch ( e ) {

      throw e;
    }
  };

  const cashInHand = useMemo(() => {
    let cash = payments['cash'] ?? 0;

    return Number(watch('openingBalance')) + Number(watch('cashAdded')) - Number(watch('cashWithdrawn')) - expenses + cash;
  }, [payments, expenses, watch('openingBalance'), watch('cashAdded'), watch('cashWithdrawn')]);

  return (
    <>
      <Tooltip title={t("Day closing")}>
        <Button variant="primary" iconButton size="lg" onClick={() => {
          setModal(true);
          setTitle(t('Close day'));
          setHideCloseButton(false);
        }} tabIndex={-1}>
          <FontAwesomeIcon icon={faShopLock}/>
        </Button>
      </Tooltip>

      <Modal open={modal} onClose={() => {
        setModal(false);
      }} title={title} shouldCloseOnOverlayClick={!hideCloseButton} hideCloseButton={hideCloseButton}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <table className="table table-borderless table-hover table-fixed">
            <tbody>
            <tr>
              <th className="text-end">{t("Store")}</th>
              <td>{closing?.store?.name}</td>
            </tr>
            <tr>
              <th className="text-end">{t("Terminal")}</th>
              <td>{closing?.terminal?.code}</td>
            </tr>
            <tr>
              <th className="text-end">{t("Day started by")}</th>
              <td>{closing?.openedBy?.displayName}</td>
            </tr>
            <tr>
              <th className="text-end">{t("Day started at")}</th>
              <td>{closing?.createdAt?.datetime && DateTime.fromISO(closing?.createdAt?.datetime || '').toFormat(import.meta.env.VITE_DATE_TIME_FORMAT as string)}</td>
            </tr>
            <tr>
              <th className="text-end">{t("Previous closing")}</th>
              <td>{withCurrency(0)}</td>
            </tr>
            <tr>
              <th className="text-end">{t("Opening balance")}</th>
              <td>
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
              </td>
            </tr>
            <tr>
              <th className="text-end">{t("Cash added")}</th>
              <td>
                <Input {...register('cashAdded', {
                  valueAsNumber: true
                })} type="number" className="w-full" tabIndex={0} selectable={true}/>
              </td>
            </tr>
            {closing?.openingBalance !== null && (
              <>
                <tr>
                  <th className="text-end">
                    {t("Expenses")}
                  </th>
                  <td>
                    <Controller
                      control={control}
                      name="expenses"
                      render={(props) => (
                        <Input
                          {...register('expenses', { valueAsNumber: true })}
                          type="number"
                          className="w-full"
                          value={expenses.toString()}
                          onChange={props.field.onChange}
                          readOnly
                          selectable={true}
                        />
                      )}
                    />
                    <p className="text-gray-500 text-sm">{t("click on expenses button to add expenses")}</p>
                  </td>
                </tr>
                <tr>
                  <th className="text-end">{t("Cash withdrawn")}</th>
                  <td>
                    <Input {...register('cashWithdrawn', {
                      valueAsNumber: true
                    })} type="number" className="w-full" tabIndex={0} selectable={true}/>
                  </td>
                </tr>
                <tr>
                  <th colSpan={2} className="text-center bg-light">
                    <strong>{t("Denomination Count")}</strong>
                  </th>
                </tr>
                {MRU_DENOMINATIONS.map(denom => (
                  <tr key={denom}>
                    <th className="text-end">{denom} MRU</th>
                    <td>
                      <Input
                        type="number"
                        min={0}
                        className="w-full"
                        value={denomCounts[denom]?.toString() || '0'}
                        onChange={(e) => setDenomCounts(prev => ({
                          ...prev,
                          [denom]: parseInt(e.target.value) || 0
                        }))}
                      />
                    </td>
                  </tr>
                ))}
                <tr>
                  <th className="text-end">{t("Denomination Total")}</th>
                  <td className="text-xl font-bold text-success-500">
                    {withCurrency(denomTotal)}
                  </td>
                </tr>
              </>
            )}
            {Object.keys(payments).map(paymentType => (
              <tr key={paymentType}>
                <th className="text-end">{paymentType.toUpperCase()} {t("sale")}</th>
                <td>
                  {withCurrency(payments[paymentType])}
                  <input type="hidden" {...register(`data.${paymentType}`)} value={payments[paymentType]}/>
                </td>
              </tr>
            ))}
            <tr>
              <th className="text-end">{t("Cash in hand")}</th>
              <td className={
                classNames(
                  'text-2xl font-bold',
                  cashInHand < 0 ? 'text-danger-500' : 'text-success-500'
                )
              }>
                {withCurrency(cashInHand)}
              </td>
            </tr>
            </tbody>
          </table>
          <table className="table table-borderless table-fixed">
            <tbody>
            <tr>
              <td colSpan={2}>
                {closing?.openingBalance !== null && (
                  <div className="alert alert-info">
                    {t("Click on Update button if you are only saving the closing.")}
                  </div>
                )}
                <div className="flex gap-3 items-center justify-center">
                  <Button onClick={() => {
                    reset({
                      ...getValues(),
                      updateOnly: true
                    });
                  }} type="submit" variant="primary" tabIndex={0} disabled={saving}>
                    {saving ? '...' : (closing?.openingBalance === null ? t('Start day') : t('Update'))}
                  </Button>
                  {closing?.openingBalance !== null && (
                    <Button type="submit" variant="primary" tabIndex={0} disabled={saving}>
                      {saving ? '...' : t('Close day')}
                    </Button>
                  )}
                </div>
              </td>
            </tr>
            </tbody>
          </table>
        </form>
        <div className="text-center">
          <Expenses onClose={() => loadExpenses({
            dateTimeFrom: closing?.dateFrom?.datetime
          })}/>
        </div>
      </Modal>
    </>
  );
};
