import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import useApi from "../../../../api/hooks/use.api";
import { HydraCollection } from "../../../../api/model/hydra";
import { BARCODE_LIST, BARCODE_GET } from "../../../../api/routing/routes/backend.app";
import { createColumnHelper } from "@tanstack/react-table";
import { jsonRequest } from "../../../../api/request/request";
import { TableComponent } from "../../../../app-common/components/table/table";
import { Barcode } from "../../../../api/model/barcode";
import { Button } from "../../../../app-common/components/input/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faPlus, faTrash, faPencilAlt } from "@fortawesome/free-solid-svg-icons";
import { ConfirmAlert } from "../../../../app-common/components/confirm/confirm.alert";
import { notify } from "../../../../app-common/components/confirm/notification";
import { CreateBarcode } from "./create.barcode";

export const DynamicBarcodes = () => {
  const { t } = useTranslation();
  const [operation, setOperation] = useState("create");
  const [entity, setEntity] = useState<Barcode>();
  const [modal, setModal] = useState(false);

  const useLoadHook = useApi<HydraCollection<Barcode>>(
    "barcodes",
    BARCODE_LIST
  );
  const { fetchData } = useLoadHook;

  const columnHelper = createColumnHelper<Barcode>();

  const columns: any = [
    columnHelper.accessor("item.name", {
      header: t("Product"),
    }),
    columnHelper.accessor("variant", {
      header: t("Variant"),
      cell: (info) => {
        const variant = info.getValue();
        return variant?.attributeValue || "—";
      },
    }),
    columnHelper.accessor("barcode", {
      header: t("Barcode"),
      cell: (info) => (
        <div className="flex items-center gap-2">
          <code style={{ fontSize: 13, fontWeight: 600 }}>{info.getValue()}</code>
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(info.getValue());
                notify({ type: "success", description: t("Barcode copied!") });
              } catch {
                notify({ type: "error", description: t("Failed to copy") });
              }
            }}
            variant="secondary"
            className="w-[30px] h-[30px] p-0">
            <FontAwesomeIcon icon={faCopy} size="sm" />
          </Button>
        </div>
      ),
    }),
    columnHelper.accessor("measurement", {
      header: t("Measurement"),
      cell: (info) => {
        const measurement = info.getValue();
        const unit = info.row.original.unit;
        if (!measurement && !unit) return "—";
        return `${measurement || ""} ${unit || ""}`.trim();
      },
    }),
    columnHelper.accessor("price", {
      header: t("Price"),
      cell: (info) => {
        const price = info.getValue();
        return price ? `${price} MRU` : "—";
      },
    }),
    columnHelper.accessor("id", {
      id: "actions",
      header: t("Actions"),
      enableSorting: false,
      enableColumnFilter: false,
      cell: (info) => {
        return (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="primary"
              className="w-[36px] h-[36px] p-0"
              onClick={() => {
                setEntity(info.row.original);
                setOperation("update");
                setModal(true);
              }}
              tabIndex={-1}>
              <FontAwesomeIcon icon={faPencilAlt} size="sm" />
            </Button>
            <ConfirmAlert
              onConfirm={() => {
                deleteBarcode(info.getValue().toString());
              }}
              confirmText={t("Yes, please")}
              cancelText={t("No, wait")}
              title={t("Confirmation")}
              description={t("Are you sure to delete this barcode?")}>
              <Button
                type="button"
                variant="danger"
                className="w-[36px] h-[36px] p-0"
                tabIndex={-1}>
                <FontAwesomeIcon icon={faTrash} size="sm" />
              </Button>
            </ConfirmAlert>
          </div>
        );
      },
    }),
  ];

  async function deleteBarcode(id: string) {
    try {
      await jsonRequest(BARCODE_GET.replace(":id", id), {
        method: "DELETE",
      });
      notify({ type: "success", description: t("Barcode deleted successfully.") });
      await fetchData();
    } catch {
      notify({ type: "error", description: t("Failed to delete barcode.") });
    }
  }

  return (
    <>
      <TableComponent
        columns={columns}
        useLoadList={useLoadHook}
        loaderLineItems={6}
        buttons={[
          {
            html: (
              <Button
                variant="primary"
                onClick={() => {
                  setEntity(undefined);
                  setOperation("create");
                  setModal(true);
                }}>
                <FontAwesomeIcon icon={faPlus} className="me-2" />
                {t("Barcode")}
              </Button>
            ),
          },
        ]}
      />

      <CreateBarcode
        entity={entity}
        onClose={() => {
          setEntity(undefined);
          setOperation("create");
          setModal(false);
          fetchData();
        }}
        operation={operation}
        showModal={modal}
      />
    </>
  );
};
