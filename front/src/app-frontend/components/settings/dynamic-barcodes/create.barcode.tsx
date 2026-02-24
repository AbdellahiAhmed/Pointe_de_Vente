import React, { FC, useEffect, useState } from "react";
import { Modal } from "../../../../app-common/components/modal/modal";
import { Controller, useForm } from "react-hook-form";
import {
  BARCODE_CREATE,
  BARCODE_GET,
  PRODUCT_KEYWORDS,
} from "../../../../api/routing/routes/backend.app";
import { fetchJson, jsonRequest } from "../../../../api/request/request";
import { handleFormError } from "../../../../lib/error/handle.form.error";
import { Input } from "../../../../app-common/components/input/input";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "../../../../app-common/components/input/button";
import { Barcode } from "../../../../api/model/barcode";
import { Product } from "../../../../api/model/product";
import * as yup from "yup";
import { ValidationMessage } from "../../../../api/model/validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { hasErrors } from "../../../../lib/error/error";

import { ReactSelect } from "../../../../app-common/components/input/custom.react.select";
import useApi from "../../../../api/hooks/use.api";

interface CreateBarcodeProps {
  entity?: Barcode;
  operation?: string;
  showModal: boolean;
  onClose?: () => void;
}

const ValidationSchema = yup
  .object({
    barcode: yup.string().required(ValidationMessage.Required),
    item: yup.string().required(ValidationMessage.Required),
    price: yup.string().required(ValidationMessage.Required),
    measurement: yup.string().nullable(),
    unit: yup.string().nullable(),
  })
  .required();

export const CreateBarcode: FC<CreateBarcodeProps> = ({
  entity,
  onClose,
  operation,
  showModal,
}) => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
    reset,
    control,
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(ValidationSchema),
  });
  const { t } = useTranslation();
  const [creating, setCreating] = useState(false);
  const [modal, setModal] = useState(false);

  // Load products for select
  const {
    data: productsData,
    isFetching: loadingProducts,
    fetchData: loadProducts,
  } = useApi<{ list: Product[] }>(
    "productKeywords",
    PRODUCT_KEYWORDS,
    {},
    "",
    "asc",
    1,
    9999999,
    {},
    { enabled: false }
  );

  const products = productsData?.list || [];

  // Build variant options from selected product
  const selectedProductIri = watch("item");
  const selectedProduct = products.find(
    (p) => `/api/products/${p.id}` === selectedProductIri || p["@id"] === selectedProductIri
  );
  const variants = selectedProduct?.variants || [];

  useEffect(() => {
    setModal(showModal);
    if (showModal) {
      loadProducts();
    }
  }, [showModal]);

  useEffect(() => {
    if (entity) {
      reset({
        id: entity.id,
        barcode: entity.barcode,
        item: entity.item?.["@id"] || "",
        variant: entity.variant?.["@id"] || "",
        price: entity.price || "",
        measurement: entity.measurement || "",
        unit: entity.unit || "",
      });
    }
  }, [entity]);

  const generateBarcode = () => {
    const timestamp = Date.now().toString().slice(-10);
    const random = Math.floor(Math.random() * 100)
      .toString()
      .padStart(2, "0");
    setValue("barcode", timestamp + random);
  };

  const createBarcode = async (values: any) => {
    setCreating(true);
    try {
      let url: string;
      let method = "POST";
      if (values.id) {
        method = "PUT";
        url = BARCODE_GET.replace(":id", values.id);
      } else {
        url = BARCODE_CREATE;
        delete values.id;
      }

      const body: any = {
        barcode: values.barcode,
        item: values.item,
        price: values.price?.toString(),
        measurement: values.measurement || null,
        unit: values.unit || null,
      };

      if (values.variant) {
        body.variant = values.variant;
      }

      await fetchJson(url, {
        method: method,
        body: JSON.stringify(body),
      });

      onModalClose();
    } catch (exception: any) {
      await handleFormError(exception, { setError });
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    reset({
      id: null,
      barcode: "",
      item: "",
      variant: "",
      price: "",
      measurement: "",
      unit: "",
    });
  };

  const onModalClose = () => {
    resetForm();
    onClose && onClose();
  };

  const productOptions = products.map((p) => ({
    label: `${p.name} (${p.barcode || "—"})`,
    value: p["@id"],
  }));

  const variantOptions = variants.map((v: any) => ({
    label: v.attributeValue || v.name || `#${v.id}`,
    value: v["@id"],
  }));

  return (
    <Modal
      open={modal}
      onClose={onModalClose}
      size="sm"
      title={
        operation === "create"
          ? t("Create barcode")
          : t("Update barcode")
      }>
      <form onSubmit={handleSubmit(createBarcode)} className="mb-5">
        <input type="hidden" {...register("id")} />
        <div className="grid grid-cols-1 gap-4 mb-3">
          {/* Barcode */}
          <div>
            <label htmlFor="barcode">{t("Barcode")}</label>
            <div className="flex gap-2">
              <Input
                {...register("barcode")}
                id="barcode"
                className="w-full"
                hasError={hasErrors(errors.barcode)}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={generateBarcode}
                style={{ whiteSpace: "nowrap" }}>
                {t("Generate")}
              </Button>
            </div>
            {errors.barcode && (
              <div className="text-danger-500 text-sm">
                <Trans>{errors.barcode.message}</Trans>
              </div>
            )}
          </div>

          {/* Product */}
          <div>
            <label>{t("Product")}</label>
            <Controller
              name="item"
              control={control}
              render={({ field }) => (
                <ReactSelect
                  options={productOptions}
                  isLoading={loadingProducts}
                  onChange={(val: any) => {
                    field.onChange(val?.value || "");
                    setValue("variant", "");
                  }}
                  value={
                    productOptions.find((o) => o.value === field.value) ||
                    null
                  }
                  isClearable
                  placeholder={t("Select product...")}
                />
              )}
            />
            {errors.item && (
              <div className="text-danger-500 text-sm">
                <Trans>{errors.item.message}</Trans>
              </div>
            )}
          </div>

          {/* Variant (if product has variants) */}
          {variants.length > 0 && (
            <div>
              <label>{t("Variant")}</label>
              <Controller
                name="variant"
                control={control}
                render={({ field }) => (
                  <ReactSelect
                    options={variantOptions}
                    onChange={(val: any) => {
                      field.onChange(val?.value || "");
                    }}
                    value={
                      variantOptions.find(
                        (o: any) => o.value === field.value
                      ) || null
                    }
                    isClearable
                    placeholder={t("Select variant...")}
                  />
                )}
              />
            </div>
          )}

          {/* Price */}
          <div>
            <label htmlFor="price">{t("Price")}</label>
            <Input
              {...register("price")}
              id="price"
              type="number"
              step="0.01"
              className="w-full"
              hasError={hasErrors(errors.price)}
            />
            {errors.price && (
              <div className="text-danger-500 text-sm">
                <Trans>{errors.price.message}</Trans>
              </div>
            )}
          </div>

          {/* Measurement & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="measurement">{t("Measurement")}</label>
              <Input
                {...register("measurement")}
                id="measurement"
                className="w-full"
                placeholder={t("e.g. 500")}
              />
            </div>
            <div>
              <label htmlFor="unit">{t("Unit")}</label>
              <Input
                {...register("unit")}
                id="unit"
                className="w-full"
                placeholder={t("e.g. g, kg, ml")}
              />
            </div>
          </div>

          {/* Submit */}
          <div>
            <Button variant="primary" type="submit" disabled={creating}>
              {creating
                ? t("Saving...")
                : operation === "create"
                  ? t("Create new")
                  : t("Update")}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
