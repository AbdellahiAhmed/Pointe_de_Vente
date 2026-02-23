import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPencilAlt,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "../../../../app-common/components/input/button";
import React, { useState } from "react";
import { Category } from "../../../../api/model/category";
import {
  CATEGORY_GET,
  CATEGORY_LIST,
} from "../../../../api/routing/routes/backend.app";
import { TableComponent } from "../../../../app-common/components/table/table";
import { createColumnHelper } from "@tanstack/react-table";
import { useSelector } from "react-redux";
import { getStore } from "../../../../duck/store/store.selector";
import { CreateCategory } from "./create.category";
import useApi from "../../../../api/hooks/use.api";
import { HydraCollection } from "../../../../api/model/hydra";
import { jsonRequest } from "../../../../api/request/request";
import { ConfirmAlert } from "../../../../app-common/components/confirm/confirm.alert";
import { Switch } from "../../../../app-common/components/input/switch";
import { notify } from "../../../../app-common/components/confirm/notification";

export const Categories = () => {
  const [operation, setOperation] = useState("create");
  const [category, setCategory] = useState<Category>();
  const [modal, setModal] = useState(false);
  const store = useSelector(getStore);

  const useLoadHook = useApi<HydraCollection<Category>>(
    "categories",
    `${CATEGORY_LIST}?store=${store?.id}`
  );
  const { fetchData } = useLoadHook;

  const { t } = useTranslation();

  const columnHelper = createColumnHelper<Category>();

  const columns: any[] = [
    columnHelper.accessor("name", {
      header: t("Name"),
    }),
    columnHelper.accessor("stores", {
      header: t("Stores"),
      cell: (info) =>
        info
          .getValue()
          .map((item) => item.name)
          .join(", "),
      enableColumnFilter: false,
    }),
    columnHelper.accessor("id", {
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
                setCategory(info.row.original);
                setOperation("update");
                setModal(true);
              }}
              tabIndex={-1}>
              <FontAwesomeIcon icon={faPencilAlt} />
            </Button>
            <span className="mx-2 text-gray-300">|</span>
            <ConfirmAlert
              onConfirm={() => {
                toggleCategory(
                  info.getValue().toString(),
                  !info.row.original.isActive
                );
              }}
              confirmText={t("Yes, please")}
              cancelText={t("No, wait")}
              title={t("Confirmation")}
              description={info.row.original.isActive ? t('Are you sure to deactivate this category?') : t('Are you sure to activate this category?')}
            >
              <Switch checked={info.row.original.isActive} readOnly />
            </ConfirmAlert>
            <span className="mx-2 text-gray-300">|</span>
            <ConfirmAlert
              onConfirm={() => {
                deleteCategory(info.getValue().toString());
              }}
              confirmText={t("Yes, please")}
              cancelText={t("No, wait")}
              title={t("Confirmation")}
              description={t("Are you sure to delete this category?")}
            >
              <Button
                type="button"
                variant="danger"
                className="w-[40px]"
                tabIndex={-1}>
                <FontAwesomeIcon icon={faTrash} />
              </Button>
            </ConfirmAlert>
          </>
        );
      },
    }),
  ];

  async function toggleCategory(id: string, status: boolean) {
    try {
      await jsonRequest(CATEGORY_GET.replace(":id", id), {
        method: "PUT",
        body: JSON.stringify({
          isActive: status,
        }),
      });

      await useLoadHook.fetchData();
      window.dispatchEvent(new Event('categories-changed'));
    } catch {
      notify({ type: 'error', description: t('An error occurred') });
    }
  }

  async function deleteCategory(id: string) {
    try {
      await jsonRequest(CATEGORY_GET.replace(":id", id), {
        method: "DELETE",
      });

      await useLoadHook.fetchData();
      window.dispatchEvent(new Event('categories-changed'));
    } catch {
      notify({ type: 'error', description: t('An error occurred') });
    }
  }

  return (
    <>
      <TableComponent
        columns={columns}
        useLoadList={useLoadHook}
        loaderLineItems={3}
        buttons={[
          {
            html: (
              <Button
                variant="primary"
                onClick={() => {
                  setModal(true);
                  setOperation("create");
                }}>
                <FontAwesomeIcon icon={faPlus} className="me-2" /> {t("Category")}
              </Button>
            ),
          },
        ]}
      />

      <CreateCategory
        entity={category}
        onClose={() => {
          setCategory(undefined);
          setOperation("create");
          setModal(false);
          fetchData();
          window.dispatchEvent(new Event('categories-changed'));
        }}
        operation={operation}
        addModal={modal}
      />
    </>
  );
};
