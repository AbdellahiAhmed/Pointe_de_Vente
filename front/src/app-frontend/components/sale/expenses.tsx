import {Button} from "../../../app-common/components/input/button";
import React, {FC, useEffect, useState} from "react";
import {Input} from "../../../app-common/components/input/input";
import {DateTime} from "luxon";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPlus, faSearch} from "@fortawesome/free-solid-svg-icons";
import {Modal} from "../../../app-common/components/modal/modal";
import {fetchJson, jsonRequest} from "../../../api/request/request";
import {useForm} from "react-hook-form";
import {Expense} from "../../../api/model/expense";
import {EXPENSE_CREATE, EXPENSE_LIST, PAYMENT_TYPE_LIST} from "../../../api/routing/routes/backend.app";
import {PaymentType} from "../../../api/model/payment.type";
import {Trans, useTranslation} from "react-i18next";
import {handleFormError} from "../../../lib/error/handle.form.error";
import {Loader} from "../../../app-common/components/loader/loader";
import {Shortcut} from "../../../app-common/components/input/shortcut";
import {useSelector} from "react-redux";
import {getStore} from "../../../duck/store/store.selector";
import {hasErrors} from "../../../lib/error/error";
import {yupResolver} from "@hookform/resolvers/yup";
import * as yup from 'yup';
import {ValidationMessage} from "../../../api/model/validation";
import {notify} from "../../../app-common/components/confirm/notification";
import { withCurrency } from "../../../lib/currency/currency";

interface ExpensesProps{
  onClose?: () => void;
}

const ValidationSchema = yup.object({
  description: yup.string().required(ValidationMessage.Required),
  amount: yup.string().required(ValidationMessage.Required),
  paymentType: yup.string().required(ValidationMessage.Required)
});

export const Expenses: FC<ExpensesProps> = (props) => {
  const {t} = useTranslation();
  const [modal, setModal] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [list, setList] = useState<Expense[]>([]);
  const [filters, setFilters] = useState<any>();
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);

  const store = useSelector(getStore);

  useEffect(() => {
    (async () => {
      try {
        const res = await jsonRequest(PAYMENT_TYPE_LIST);
        const json = await res.json();
        const list: PaymentType[] = json["hydra:member"] ?? [];
        setPaymentTypes(list.filter((p) => p.isActive));
      } catch {}
    })();
  }, []);

  const {register, handleSubmit, reset} = useForm();
  const loadExpenses = async (values?: any) => {
    setLoading(true);

    setFilters(values);
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

      setList(json.list);
    } catch (e) {
      notify({ type: 'error', description: t('An error occurred') });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (modal) {
      loadExpenses({
        dateTimeFrom: DateTime.now().startOf('day').toFormat("yyyy-MM-dd'T'HH:mm"),
        dateTimeTo: DateTime.now().endOf('day').toFormat("yyyy-MM-dd'T'HH:mm")
      });
      reset({
        dateTimeFrom: DateTime.now().startOf('day').toFormat("yyyy-MM-dd'T'HH:mm"),
        dateTimeTo: DateTime.now().endOf('day').toFormat("yyyy-MM-dd'T'HH:mm")
      });

      createReset();
    }
    reset();
  }, [modal]);


  const {register: createRegister, handleSubmit: createHandleSubmit, reset: createReset, formState: {errors: createErrors}, setError: createSetError} = useForm({
    resolver: yupResolver(ValidationSchema)
  });

  const [creating, setCreating] = useState(false);
  const createExpense = async (values: any) => {
    setCreating(true);
    try {
      const { paymentType, ...rest } = values;
      await fetchJson(EXPENSE_CREATE, {
        method: 'POST',
        body: JSON.stringify({
          ...rest,
          dateTime: DateTime.now().toISO(),
          store: store?.id,
          paymentType: paymentType ? Number(paymentType) : null
        })
      });

      loadExpenses(filters);
      createReset();
    } catch (exception: any) {
      await handleFormError(exception, { setError: createSetError });
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <Button variant="danger" size="lg" onClick={() => {
        setModal(true);
      }} title={t("Expenses")} type="button" tabIndex={-1}>
        {t("Expenses")}
        <Shortcut actionId="open_expenses" handler={() => setModal(true)} />
      </Button>

      <Modal open={modal} onClose={() => {
        setModal(false);
        if(props.onClose){
          props.onClose();
        }

      }} title={t("Expenses")} size="full">
        <form onSubmit={createHandleSubmit(createExpense)}>
          <h3 className="text-lg">{t("Add new expenses")}</h3>
          <div className="grid grid-cols-9 gap-4 mb-5">
            <div className="col-span-3">
              <Input {...createRegister('description')}
                     type="text"
                     placeholder={t("Description")}
                     className="w-full"
                     hasError={hasErrors(createErrors.description)}
              />
              {createErrors.description && (
                <div className="text-danger-500 text-sm">
                  <Trans>
                    {createErrors.description.message}
                  </Trans>
                </div>
              )}
            </div>
            <div className="col-span-2">
              <Input {...createRegister('amount')}
                     type="number"
                     placeholder={t("Expense Amount")}
                     className="w-full"
                     hasError={hasErrors(createErrors.amount)}
              />
              {createErrors.amount && (
                <div className="text-danger-500 text-sm">
                  <Trans>
                    {createErrors.amount.message}
                  </Trans>
                </div>
              )}
            </div>
            <div className="col-span-2">
              <select
                {...createRegister('paymentType')}
                className={`input w-full ${hasErrors(createErrors.paymentType) ? 'border-danger-500' : ''}`}
              >
                <option value="">{t("Payment type")}</option>
                {paymentTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </select>
              {createErrors.paymentType && (
                <div className="text-danger-500 text-sm">
                  <Trans>
                    {createErrors.paymentType.message}
                  </Trans>
                </div>
              )}
            </div>
            <div className="col-span-2">
              <Button variant="primary" className="w-full" type="submit"
                      disabled={creating}>
                {creating ? t('Adding...') : (
                  <>
                    <FontAwesomeIcon icon={faPlus} className="me-2" /> {t("Expense")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
        <hr className="my-5"/>
        <form onSubmit={handleSubmit(loadExpenses)}>
          <h3 className="text-lg">{t("Search")}</h3>
          <div className="grid grid-cols-5 gap-4 mb-5">
            <div className="col-span-2">
              <Input {...register('dateTimeFrom')}
                     type="datetime-local"
                     placeholder={t("Start time")}
                     className="w-full"
              />
            </div>
            <div className="col-span-2">
              <Input {...register('dateTimeTo')}
                     type="datetime-local"
                     placeholder={t("End time")}
                     className="w-full"
              />
            </div>
            <div>
              <Button variant="primary" className="w-full" type="submit"
                      disabled={isLoading}>{isLoading ? t('Loading...') : (
                <>
                  <FontAwesomeIcon icon={faSearch} className="me-2" /> {t("Search expenses")}
                </>
              )}</Button>
            </div>
          </div>
        </form>

        {isLoading && (
          <div className="flex justify-center items-center">
            <Loader lines={10} lineItems={3}/>
          </div>
        )}
        {!isLoading && (
          <>
          <div className="grid grid-cols-4 gap-4 mb-5">
            <div className="border border-danger-500 p-5 font-bold text-danger-500 rounded">
              {t("Expenses")}
              <span className="float-end">
                {withCurrency(list.reduce((prev, item) => prev + item.amount , 0))}
              </span>
            </div>
            <div></div>
          </div>

            <table className="table border border-collapse">
              <thead>
              <tr>
                <th>{t("Time")}</th>
                <th>{t("Description")}</th>
                <th>{t("Payment type")}</th>
                <th>{t("Amount")}</th>
              </tr>
              </thead>
              <tbody>
              {list.map((order, index) => (
                <tr key={index} className="hover:bg-gray-100">
                  <td title={order.createdAt}>{DateTime.fromISO(order.createdAt).toRelative({base: DateTime.now()})}</td>
                  <td>{order.description}</td>
                  <td>{order.paymentTypeName ?? '-'}</td>
                  <td>{withCurrency(order.amount)}</td>
                </tr>
              ))}
              </tbody>
            </table>
          </>
        )}
      </Modal>
    </>
  );
};
