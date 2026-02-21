import { Button } from "../../../../app-common/components/input/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPencilAlt,
  faPlus,
  faBolt,
  faEllipsis, faEye, faPencil, faTrash
} from "@fortawesome/free-solid-svg-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Product } from "../../../../api/model/product";
import {
  PRODUCT_GET,
  PRODUCT_LIST,
} from "../../../../api/routing/routes/backend.app";
import { TableComponent } from "../../../../app-common/components/table/table";
import { useTranslation } from "react-i18next";
import { createColumnHelper } from "@tanstack/react-table";
import { ImportItems } from "./import.items";
import { ExportItems } from "./export.items";
import { CreateItem } from "./manage-item/items.create";
import { QuickCreateItem } from "./manage-item/items.quick-create";
import useApi from "../../../../api/hooks/use.api";
import { HydraCollection } from "../../../../api/model/hydra";
import { ConfirmAlert } from "../../../../app-common/components/confirm/confirm.alert";
import { jsonRequest } from "../../../../api/request/request";
import { Switch } from "../../../../app-common/components/input/switch";
import { ItemComponent } from "./item";
import { Menu, MenuItem } from "react-aria-components";
import { DropdownMenu, DropdownMenuItem } from "../../../../app-common/components/react-aria/dropdown.menu";

export const Items = () => {
  const useLoadHook = useApi<HydraCollection<Product>>(
    "products",
    PRODUCT_LIST
  );
  const [entity, setEntity] = useState<Product>();
  const [operation, setOperation] = useState("create");
  const [modal, setModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  // Refresh product list when products change (e.g. after CSV import)
  useEffect(() => {
    const handler = () => { useLoadHook.fetchData(); };
    window.addEventListener('products-changed', handler);
    return () => window.removeEventListener('products-changed', handler);
  }, []);

  const { t } = useTranslation();

  const columnHelper = createColumnHelper<Product>();

  const columns: any[] = [
    {
      id: 'select',
      header: ({ table }: any) => (
        <input
          type="checkbox"
          className="form-check-input"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
        />
      ),
      cell: ({ row }: any) => (
        <input
          type="checkbox"
          className="form-check-input"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
        />
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
    columnHelper.accessor("name", {
      header: t("Name"),
    }),
    columnHelper.accessor("barcode", {
      header: t("Barcode"),
    }),
    columnHelper.accessor("basePrice", {
      header: t("Sale Price"),
    }),
    columnHelper.accessor("cost", {
      header: t("PMP (Avg. Cost)"),
    }),
    columnHelper.accessor("department.name", {
      header: t("Department"),
    }),
    columnHelper.accessor("categories", {
      id: "categories.name",
      header: t("Categories"),
      cell: (info) =>
        info
          .getValue()
          .map((item) => item.name)
          .join(", "),
    }),
    columnHelper.accessor("suppliers", {
      id: "suppliers.name",
      header: t("Suppliers"),
      cell: (info) =>
        info
          .getValue()
          .map((item) => item.name)
          .join(", "),
    }),
    columnHelper.accessor("brands", {
      id: "brands.name",
      header: t("Brands"),
      cell: (info) =>
        info
          .getValue()
          .map((item) => item.name)
          .join(", "),
    }),
    columnHelper.accessor("variants", {
      header: t("Variants"),
      cell: (info) => `${info.getValue().length} ${t("variants")}`,
      enableSorting: false,
      enableColumnFilter: false,
    }),
    columnHelper.accessor("taxes", {
      id: "taxes.name",
      header: t("Taxes"),
      cell: (info) =>
        info
          .getValue()
          .map((item) => `${item.name} ${item.rate}%`)
          .join(", "),
    }),
    columnHelper.accessor("stores", {
      header: t("Stores"),
      cell: (info) =>
        info
          .getValue()
          .map((item) => item.store.name)
          .join(", "),
      enableColumnFilter: false,
      enableSorting: false,
    }),
    columnHelper.accessor("terminals", {
      header: t("Terminals"),
      cell: (info) =>
        info
          .getValue()
          .map((item) => item.code)
          .join(", "),
      enableColumnFilter: false,
      enableSorting: false,
    }),
    columnHelper.accessor("id", {
      id: "actions",
      header: t("Actions"),
      enableSorting: false,
      enableColumnFilter: false,
      cell: (info) => {
        return (
          <div className="flex gap-1">
            <ConfirmAlert
              onConfirm={() => {
                deleteItem(
                  info.row.original.id.toString(),
                  !info.row.original.isActive
                );
              }}
              confirmText={t("Yes, please")}
              cancelText={t("No, wait")}
              title={t("Confirmation")}
              description={info.row.original.isActive ? t('Are you sure to deactivate this item?') : t('Are you sure to activate this item?')}
            >
              <Switch checked={info.row.original.isActive}></Switch>
            </ConfirmAlert>
            <ItemComponent product={info.row.original}/>
            <DropdownMenu label={
              <FontAwesomeIcon icon={faEllipsis}/>
            } onAction={key => {
              if(key === 'edit'){
                setEntity(info.row.original);
                setOperation("update");
                setModal(true);
              }
              if(key === 'delete'){
                setDeleteTarget(info.row.original);
                setShowDeleteConfirm(true);
              }
            }}>
              <DropdownMenuItem id="edit" icon={faPencil}>{t("Edit")}</DropdownMenuItem>
              <DropdownMenuItem id="delete" icon={faTrash}>{t("Delete")}</DropdownMenuItem>
            </DropdownMenu>
          </div>
        );
      },
    }),
  ];

  function notifyProductsChanged() {
    window.dispatchEvent(new Event('products-changed'));
  }

  async function deleteItem(id: string, status: boolean) {
    await jsonRequest(PRODUCT_GET.replace(":id", id), {
      method: "PUT",
      body: JSON.stringify({
        isActive: status,
      }),
    });

    await useLoadHook.fetchData();
    notifyProductsChanged();
  }

  async function hardDeleteItem(id: string) {
    await jsonRequest(PRODUCT_GET.replace(":id", id), {
      method: "DELETE",
    });
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
    await useLoadHook.fetchData();
    notifyProductsChanged();
  }

  async function bulkDeleteItems() {
    setBulkDeleting(true);
    for (const product of selectedProducts) {
      await jsonRequest(PRODUCT_GET.replace(":id", product.id.toString()), {
        method: "DELETE",
      });
    }
    setBulkDeleting(false);
    setShowBulkDeleteConfirm(false);
    setSelectedProducts([]);
    await useLoadHook.fetchData();
    notifyProductsChanged();
  }

  const handleSelectedRowsChange = useCallback((rows: any[]) => {
    setSelectedProducts(rows as Product[]);
  }, []);

  return (
    <>
      <TableComponent
        columns={columns}
        useLoadList={useLoadHook}
        enableRowSelection={true}
        onSelectedRowsChange={handleSelectedRowsChange}
        selectionButtons={[
          {
            html: (
              <Button
                variant="danger"
                onClick={() => setShowBulkDeleteConfirm(true)}>
                <FontAwesomeIcon icon={faTrash} className="me-2" />
                {t("Delete")} ({selectedProducts.length})
              </Button>
            ),
          },
        ]}
        buttons={[
          {
            html: <ImportItems />,
          },
          {
            html: <ExportItems />,
          },
          {
            html: (
              <Button
                variant="success"
                onClick={() => setQuickCreateOpen(true)}>
                <FontAwesomeIcon icon={faBolt} className="me-2" /> {t("Quick Add")}
              </Button>
            ),
          },
          {
            html: (
              <Button
                variant="primary"
                onClick={() => {
                  setModal(true);
                  setOperation("create");
                }}>
                <FontAwesomeIcon icon={faPlus} className="me-2" /> {t("Item")}
              </Button>
            ),
          },
        ]}
        loaderLineItems={12}
        loaderLines={10}
      />

      <CreateItem
        addModal={modal}
        entity={entity}
        onClose={() => {
          setModal(false);
          setOperation("create");
          useLoadHook.fetchData();
          setEntity(undefined);
          notifyProductsChanged();
        }}
        operation={operation}
      />

      <QuickCreateItem
        open={quickCreateOpen}
        onClose={() => {
          setQuickCreateOpen(false);
          useLoadHook.fetchData();
          notifyProductsChanged();
        }}
      />

      {showDeleteConfirm && deleteTarget && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header bg-danger text-white">
                  <h5 className="modal-title">{t('Delete Product')}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }} />
                </div>
                <div className="modal-body">
                  <p>{t('Are you sure you want to permanently delete this product?')}</p>
                  <p className="fw-bold mb-0">{deleteTarget.name}</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}>
                    {t('Cancel')}
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => hardDeleteItem(deleteTarget.id.toString())}>
                    <FontAwesomeIcon icon={faTrash} className="me-2" />
                    {t('Delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showBulkDeleteConfirm && selectedProducts.length > 0 && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <div className="modal-header bg-danger text-white">
                  <h5 className="modal-title">{t('Delete Products')}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowBulkDeleteConfirm(false)} />
                </div>
                <div className="modal-body">
                  <p>{t('Are you sure you want to permanently delete these products?')}</p>
                  <ul className="mb-0">
                    {selectedProducts.map(p => (
                      <li key={p.id} className="fw-bold">{p.name}</li>
                    ))}
                  </ul>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowBulkDeleteConfirm(false)} disabled={bulkDeleting}>
                    {t('Cancel')}
                  </button>
                  <button type="button" className="btn btn-danger" onClick={bulkDeleteItems} disabled={bulkDeleting}>
                    <FontAwesomeIcon icon={faTrash} className="me-2" />
                    {bulkDeleting ? `${t('Deleting')}...` : `${t('Delete')} (${selectedProducts.length})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};
