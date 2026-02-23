import React, { FC, PropsWithChildren, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPencilAlt,
  faTrash,
  faUsers,
  faHistory
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "../../../app-common/components/input/button";
import { Modal } from "../../../app-common/components/modal/modal";
import { Customer } from "../../../api/model/customer";
import { fetchJson } from "../../../api/request/request";
import { useForm, Controller } from "react-hook-form";
import { Input } from "../../../app-common/components/input/input";
import { faSquare, faSquareCheck } from "@fortawesome/free-regular-svg-icons";
import { CustomerPayments } from "./customer.payments";
import { ConfirmAlert } from "../../../app-common/components/confirm/confirm.alert";
import {
  CUSTOMER_CREATE,
  CUSTOMER_EDIT,
  CUSTOMER_DELETE,
  CUSTOMER_LIST,
} from "../../../api/routing/routes/backend.app";
import {
  ConstraintViolation,
  ValidationResult,
} from "../../../lib/validator/validation.result";
import { useTranslation } from "react-i18next";
import {
  HttpException,
  UnprocessableEntityException,
} from "../../../lib/http/exception/http.exception";
import { createColumnHelper } from "@tanstack/react-table";
import { TableComponent } from "../../../app-common/components/table/table";
import { Shortcut } from "../../../app-common/components/input/shortcut";
import * as yup from "yup";
import { ValidationMessage } from "../../../api/model/validation";
import { getErrors, hasErrors } from "../../../lib/error/error";
import { yupResolver } from "@hookform/resolvers/yup";
import useApi from "../../../api/hooks/use.api";
import { HydraCollection } from "../../../api/model/hydra";
import { notify } from "../../../app-common/components/confirm/notification";
import { withCurrency } from "../../../lib/currency/currency";
import { useAtom } from "jotai";
import { defaultState } from "../../../store/jotai";
import { Switch } from "../../../app-common/components/input/switch";

interface Props extends PropsWithChildren {
  className?: string;
}

const ValidationSchema = yup.object({
  name: yup.string().trim().required(ValidationMessage.Required),
  phone: yup.string().trim().required(ValidationMessage.Required),
  cnic: yup.string().trim().optional(),
  openingBalance: yup
    .number()
    .typeError(ValidationMessage.Number)
    .required(ValidationMessage.Required),
  allowCreditSale: yup.boolean().default(false),
  creditLimit: yup
    .number()
    .transform((value, original) => (original === '' || original === null ? undefined : value))
    .nullable()
    .optional()
    .typeError(ValidationMessage.Number),
});

export const Customers: FC<Props> = ({ children, className }) => {
  const [appState, setAppState] = useAtom(defaultState);
  const { customer } = appState;
  const setCustomer = (customer?: Customer) => {
    setAppState((prev) => ({
      ...prev,
      customer,
    }));
  };

  const [modal, setModal] = useState(false);
  const [operation, setOperation] = useState("create");

  const useLoadHook = useApi<HydraCollection<Customer>>(
    "customers",
    CUSTOMER_LIST
  );
  const { fetchData } = useLoadHook;

  const { t } = useTranslation();

  const columnHelper = createColumnHelper<Customer>();

  const columns = [
    columnHelper.accessor("name", {
      header: t("Name"),
    }),
    columnHelper.accessor("phone", {
      header: t("Phone"),
    }),
    columnHelper.accessor("cnic", {
      header: t("National ID"),
    }),
    columnHelper.accessor("openingBalance", {
      header: t("Opening balance"),
      cell: info => withCurrency(info.getValue())
    }),
    columnHelper.accessor("sale", {
      header: t("Credit Sale"),
      enableSorting: false,
      enableColumnFilter: false,
      cell: info => withCurrency(info.getValue())
    }),
    columnHelper.accessor("paid", {
      header: t("Payments"),
      enableSorting: false,
      enableColumnFilter: false,
      cell: info => withCurrency(info.getValue())
    }),
    columnHelper.accessor("outstanding", {
      header: t("Balance"),
      enableSorting: false,
      enableColumnFilter: false,
      cell: (info) =>
        withCurrency(
          info.getValue() + Number(info.row.original.openingBalance)
        ),
    }),
    columnHelper.accessor("id", {
      id: "customerSelector",
      enableSorting: false,
      enableColumnFilter: false,
      header: t("Select"),
      cell: (info) => (
        <>
          {customer?.id === info.getValue() ? (
            <Button
              variant="success"
              onClick={() => setCustomer(undefined)}
              className="w-[40px]"
              type="button">
              <FontAwesomeIcon icon={faSquareCheck} size="lg" />
            </Button>
          ) : (
            <Button
              onClick={() => {
                setCustomer(info.row.original);
                setModal(false); // close modal when selecting customer
              }}
              disabled={customer?.id === info.getValue()}
              className="w-[40px]">
              <FontAwesomeIcon icon={faSquare} size="lg" />
            </Button>
          )}
        </>
      ),
    }),
    columnHelper.accessor("id", {
      id: "actions",
      header: t("Actions"),
      enableSorting: false,
      enableColumnFilter: false,
      cell: (info) => {
        return (
          <>
            <Button
              type="button"
              variant="primary"
              className="w-[40px]"
              onClick={() => {
                reset({
                  name: info.row.original.name,
                  phone: info.row.original.phone,
                  cnic: info.row.original.cnic,
                  openingBalance: info.row.original.openingBalance,
                  allowCreditSale: info.row.original.allowCreditSale,
                  creditLimit: info.row.original.creditLimit,
                  id: info.row.original.id
                });
                setOperation("update");
              }}>
              <FontAwesomeIcon icon={faPencilAlt} />
            </Button>
            <span className="mx-2 text-gray-300">|</span>
            <ConfirmAlert
              title={t("Delete customer")}
              description={t("Are you sure you want to delete this customer?")}
              onConfirm={async () => {
                try {
                  await fetchJson(CUSTOMER_DELETE.replace(":id", info.getValue()), {
                    method: "DELETE",
                  });
                  if (customer?.id === info.getValue()) {
                    setCustomer(undefined);
                  }
                  fetchData?.();
                  notify({ type: "success", description: t("Customer deleted") });
                } catch (e: any) {
                  notify({
                    type: "error",
                    description: e.message || t("Cannot delete customer with existing orders"),
                  });
                }
              }}
            >
              <Button variant="danger" type="button">
                <FontAwesomeIcon icon={faTrash} />
              </Button>
            </ConfirmAlert>
            <span className="mx-2 text-gray-300">|</span>
            <CustomerPayments
              customer={info.row.original}
              onCreate={fetchData}
            >
              <FontAwesomeIcon icon={faHistory} />
            </CustomerPayments>
          </>
        );
      },
    }),
  ];

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
    reset,
    control,
  } = useForm({
    resolver: yupResolver(ValidationSchema),
    defaultValues: {
      name: "",
      phone: "",
      cnic: "",
      openingBalance: 0,
      allowCreditSale: false,
      creditLimit: "",
    },
  });
  const [creating, setCreating] = useState(false);
  const createCustomer = async (values: any, event?: any) => {
    event.stopPropagation();
    event.preventDefault();

    setCreating(true);
    try {
      let url,
        method = "POST";
      if (values.id) {
        method = "PUT";
        url = CUSTOMER_EDIT.replace(":id", values.id);
      } else {
        url = CUSTOMER_CREATE;
      }

      // API Platform expects decimal fields as strings
      values.openingBalance = String(values.openingBalance ?? 0);
      if (values.creditLimit === '' || values.creditLimit === undefined || values.creditLimit === null) {
        values.creditLimit = null;
      } else {
        values.creditLimit = String(values.creditLimit);
      }
      // Ensure allowCreditSale is always a boolean
      values.allowCreditSale = !!values.allowCreditSale;

      // Remove id from body (API Platform uses it from URL only)
      const { id, ...body } = values;

      const response = await fetchJson(url, {
        method: method,
        body: JSON.stringify(body),
      });

      setCustomer(response.customer);

      fetchData?.();

      notify({
        type: "success",
        description: operation === "create" ? t("Customer created") : t("Customer updated"),
      });

      resetForm();
      setOperation("create");
    } catch (exception: any) {
      if (exception instanceof HttpException) {
        if (exception.message) {
          notify({
            type: "error",
            description: exception.message,
          });
        }
      }

      if (exception instanceof UnprocessableEntityException) {
        const e: ValidationResult = await exception.response.json();
        e.violations.forEach((item: ConstraintViolation) => {
          setError(item.propertyPath, {
            message: item.message,
            type: "server",
          });
        });

        if (e.errorMessage) {
          notify({
            type: "error",
            description: e.errorMessage,
          });
        }

        return false;
      }

      throw exception;
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    reset({
      name: "",
      phone: "",
      cnic: "",
      openingBalance: 0,
      allowCreditSale: false,
      creditLimit: ""
    });
  };

  return (
    <>
      <button
        className={className ? className : "btn btn-primary lg"}
        type="button"
        onClick={() => {
          setModal(true);
        }}
        title={t("Customers")}
        tabIndex={-1}>
        {children || (
          <>
            <FontAwesomeIcon icon={faUsers} className="me-2" /> {t("Customers")}
          </>
        )}
        <Shortcut actionId="open_customers" handler={() => setModal(true)} />
      </button>

      <Modal
        shouldCloseOnEsc={true}
        open={modal}
        onClose={() => {
          setModal(false);
        }}
        title={t("Customers")}>
        <form className="mb-5" onSubmit={handleSubmit(createCustomer)}>
          <div className="grid lg:grid-cols-4 gap-4 gap-y-2 mb-3 md:grid-cols-3 sm:grid-cols-1">
            <div>
              <label htmlFor="name">{t("Name")}</label>
              <Input
                {...register("name")}
                id="name"
                className="w-full"
                hasError={hasErrors(errors.name)}
              />
              {getErrors(errors.name)}
            </div>
            <div>
              <label htmlFor="phone">{t("Phone")}</label>
              <Input
                {...register("phone")}
                id="phone"
                className="w-full"
                hasError={hasErrors(errors.phone)}
              />
              {getErrors(errors.phone)}
            </div>
            <div>
              <label htmlFor="cnic">{t("National ID")}</label>
              <Input
                {...register("cnic")}
                id="cnic"
                className="w-full"
                hasError={hasErrors(errors.cnic)}
              />
              {getErrors(errors.cnic)}
            </div>
            <div>
              <label htmlFor="openingBalance">{t("Opening balance")}</label>
              <Input
                {...register("openingBalance")}
                id="openingBalance"
                className="w-full"
                hasError={hasErrors(errors.openingBalance)}
                type="number"
              />
              {getErrors(errors.openingBalance)}
            </div>
            <div>
              <label className="md:block w-full sm:hidden">&nbsp;</label>
              <Controller
                name="allowCreditSale"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={!!field.value}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => field.onChange(e.target.checked)}
                    name={field.name}
                  >
                    {t("Allow credit")}
                  </Switch>
                )}
              />
              {getErrors(errors.allowCreditSale)}
            </div>
            <div>
              <label htmlFor="creditLimit">{t("Credit Limit")}</label>
              <Input
                {...register("creditLimit")}
                id="creditLimit"
                className="w-full"
                hasError={hasErrors(errors.creditLimit)}
                type="number"
              />
              {getErrors(errors.creditLimit)}
            </div>
            <div>
              <label className="md:block w-full sm:hidden">&nbsp;</label>
              <Button variant="primary" type="submit" disabled={creating}>
                {creating
                  ? t("Saving...")
                  : operation === "create"
                    ? t("Create new")
                    : t("Update")}
              </Button>

              {operation === "update" && (
                <Button
                  variant="secondary"
                  className="ms-3"
                  type="button"
                  onClick={() => {
                    setOperation("create");
                    resetForm();
                  }}>
                  {t("Cancel")}
                </Button>
              )}
            </div>
          </div>
        </form>

        <hr/>

        <TableComponent
          columns={columns}
          useLoadList={useLoadHook}
          loaderLineItems={9}
          // setFilters={mergeFilters}
        />
      </Modal>
    </>
  );
};
