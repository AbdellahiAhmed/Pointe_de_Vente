import React, { useEffect, useState } from "react";
import {
  PAYMENT_TYPE_GET,
  PAYMENT_TYPE_LIST,
  BANK_JOURNAL_SUMMARY,
} from "../../../../api/routing/routes/backend.app";
import { useTranslation } from "react-i18next";
import { createColumnHelper } from "@tanstack/react-table";
import { Button } from "../../../../app-common/components/input/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLandmark, faPencilAlt, faPlus, faTrash, faArrowDown, faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { TableComponent } from "../../../../app-common/components/table/table";
import { PaymentType } from "../../../../api/model/payment.type";
import { useSelector } from "react-redux";
import { getAuthorizedUser } from "../../../../duck/auth/auth.selector";
import { getStore } from "../../../../duck/store/store.selector";
import { CreatePaymentType } from "./create.payment.type";
import useApi from "../../../../api/hooks/use.api";
import { HydraCollection } from "../../../../api/model/hydra";
import { Switch } from "../../../../app-common/components/input/switch";
import { ConfirmAlert } from "../../../../app-common/components/confirm/confirm.alert";
import { fetchJson, jsonRequest } from "../../../../api/request/request";
import { notify } from "../../../../app-common/components/confirm/notification";
import { withCurrency } from "../../../../lib/currency/currency";
import { Modal } from "../../../../app-common/components/modal/modal";

interface BankSummaryItem {
  id: number;
  name: string;
  type: string;
  totalIn: number;
  totalOut: number;
  balance: number;
}

export const PaymentTypes = () => {
  const [operation, setOperation] = useState("create");

  const user = useSelector(getAuthorizedUser);
  const store = useSelector(getStore);

  const useLoadHook = useApi<HydraCollection<PaymentType>>(
    "paymentTypes",
    `${PAYMENT_TYPE_LIST}?store=${store?.id}`
  );
  const { fetchData } = useLoadHook;
  const [paymentType, setPaymentType] = useState<PaymentType>();
  const [modal, setModal] = useState(false);

  // Bank balance state
  const [bankSummary, setBankSummary] = useState<Record<number, BankSummaryItem>>({});
  const [balanceDetail, setBalanceDetail] = useState<BankSummaryItem | null>(null);

  const { t } = useTranslation();

  // Fetch bank balances
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchJson(BANK_JOURNAL_SUMMARY);
        const indexed: Record<number, BankSummaryItem> = {};
        for (const p of data.payments ?? []) {
          indexed[p.id] = p;
        }
        setBankSummary(indexed);
      } catch {}
    })();
  }, []);

  const columnHelper = createColumnHelper<PaymentType>();

  const columns: any = [
    columnHelper.accessor("name", {
      header: t("Name"),
    }),
    columnHelper.accessor("type", {
      header: t("Type"),
    }),
    columnHelper.accessor("canHaveChangeDue", {
      header: t("Can accept amount greater then total?"),
      cell: (info) => (info.getValue() ? t("Yes") : t("No")),
      enableColumnFilter: false,
    }),
    columnHelper.accessor("stores", {
      header: t("Stores"),
      enableSorting: false,
      enableColumnFilter: false,
      cell: (info) =>
        info
          .getValue()
          .map((item) => item.name)
          .join(", "),
    }),
    columnHelper.accessor("id", {
      header: t("Actions"),
      enableSorting: false,
      enableColumnFilter: false,
      cell: (info) => {
        const ptId = Number(info.getValue());
        const summary = bankSummary[ptId];
        const isCredit = info.row.original.type === 'credit';
        return (
          <>
            {!isCredit && (
              <>
                <Button
                  type="button"
                  variant="warning"
                  className="w-[40px]"
                  onClick={() => {
                    if (summary) setBalanceDetail(summary);
                  }}
                  tabIndex={-1}
                  title={summary ? `${t("Balance")}: ${withCurrency(summary.balance)}` : t("Balance")}
                >
                  <FontAwesomeIcon icon={faLandmark} />
                </Button>
                <span className="mx-2 text-gray-300">|</span>
              </>
            )}
            <Button
              type="button"
              variant="primary"
              className="w-[40px]"
              onClick={() => {
                setPaymentType(info.row.original);
                setOperation("update");
                setModal(true);
              }}
              tabIndex={-1}>
              <FontAwesomeIcon icon={faPencilAlt} />
            </Button>
            <span className="mx-2 text-gray-300">|</span>
            <ConfirmAlert
              onConfirm={() => {
                togglePaymentType(
                  info.getValue().toString(),
                  !info.row.original.isActive
                );
              }}
              confirmText={t("Yes, please")}
              cancelText={t("No, wait")}
              title={t("Confirmation")}
              description={info.row.original.isActive ? t('Are you sure to deactivate this payment type?') : t('Are you sure to activate this payment type?')}>
              <Switch checked={info.row.original.isActive} readOnly />
            </ConfirmAlert>
            <span className="mx-2 text-gray-300">|</span>
            <ConfirmAlert
              onConfirm={() => {
                deletePaymentType(info.getValue().toString());
              }}
              confirmText={t("Yes, please")}
              cancelText={t("No, wait")}
              title={t("Confirmation")}
              description={t("Are you sure to delete this payment type?")}
            >
              <Button type="button" variant="danger" className="w-[40px]" tabIndex={-1}>
                <FontAwesomeIcon icon={faTrash} />
              </Button>
            </ConfirmAlert>
          </>
        );
      },
    }),
  ];

  async function togglePaymentType(id: string, status: boolean) {
    try {
      await jsonRequest(PAYMENT_TYPE_GET.replace(":id", id), {
        method: "PUT",
        body: JSON.stringify({
          isActive: status,
        }),
      });

      await useLoadHook.fetchData();
    } catch {
      notify({ type: 'error', description: t('An error occurred') });
    }
  }

  async function deletePaymentType(id: string) {
    try {
      await jsonRequest(PAYMENT_TYPE_GET.replace(":id", id), {
        method: "DELETE",
      });

      await useLoadHook.fetchData();
    } catch {
      notify({ type: 'error', description: t('An error occurred') });
    }
  }

  return (
    <>
      <TableComponent
        columns={columns}
        useLoadList={useLoadHook}
        loaderLineItems={5}
        buttons={[
          {
            html: (
              <Button
                variant="primary"
                onClick={() => {
                  setModal(true);
                  setOperation("create");
                }}>
                <FontAwesomeIcon icon={faPlus} className="me-2" /> {t("Payment type")}
              </Button>
            ),
          },
        ]}
      />

      <CreatePaymentType
        addModal={modal}
        onClose={() => {
          setPaymentType(undefined);
          setOperation("create");
          setModal(false);
          fetchData();
        }}
        entity={paymentType}
        operation={operation}
      />

      {/* Bank balance detail modal */}
      <Modal
        open={balanceDetail !== null}
        onClose={() => setBalanceDetail(null)}
        title={balanceDetail?.name ?? t("Account Balance")}
        size="sm"
      >
        {balanceDetail && (
          <div className="space-y-4 p-2">
            {/* Balance header */}
            <div className="text-center py-4 rounded-xl bg-gray-50 border">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {t("Balance")}
              </p>
              <p className={`text-3xl font-bold ${
                balanceDetail.balance > 0 ? 'text-green-600' :
                balanceDetail.balance < 0 ? 'text-red-600' : 'text-gray-500'
              }`}>
                {withCurrency(balanceDetail.balance)}
              </p>
            </div>

            {/* In / Out details */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
                <FontAwesomeIcon icon={faArrowDown} className="text-green-500 mb-2" />
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                  {t("Total In")}
                </p>
                <p className="text-lg font-bold text-green-700">
                  {withCurrency(balanceDetail.totalIn)}
                </p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center">
                <FontAwesomeIcon icon={faArrowUp} className="text-red-500 mb-2" />
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">
                  {t("Total Out")}
                </p>
                <p className="text-lg font-bold text-red-700">
                  {withCurrency(balanceDetail.totalOut)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};
