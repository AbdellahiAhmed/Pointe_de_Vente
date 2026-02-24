import React, { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudUploadAlt, faRefresh, faTimes } from "@fortawesome/free-solid-svg-icons";
import classNames from "classnames";

import { Modal } from "../../../../../app-common/components/modal/modal";
import { Input } from "../../../../../app-common/components/input/input";
import { Button } from "../../../../../app-common/components/input/button";
import { ReactSelect } from "../../../../../app-common/components/input/custom.react.select";
import { notify } from "../../../../../app-common/components/confirm/notification";
import { fetchJson, request } from "../../../../../api/request/request";
import {
  CATEGORY_LIST,
  MEDIA_UPLOAD,
  PRODUCT_CREATE,
} from "../../../../../api/routing/routes/backend.app";
import useApi from "../../../../../api/hooks/use.api";
import { HydraCollection } from "../../../../../api/model/hydra";
import { Category } from "../../../../../api/model/category";
import { withCurrency } from "../../../../../lib/currency/currency";
import { getErrorClass, getErrors, hasErrors } from "../../../../../lib/error/error";
import { handleFormError } from "../../../../../lib/error/handle.form.error";
import { ValidationMessage } from "../../../../../api/model/validation";
import { getStore } from "../../../../../duck/store/store.selector";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface QuickCreateProps {
  open: boolean;
  onClose: () => void;
}

interface QuickCreateFormValues {
  name: string;
  barcode: string;
  cost: number | string;
  basePrice: number | string;
  minPrice?: number | string;
  category: { label: string; value: string } | null;
  quantity: number | string;
}

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const QuickCreateSchema = yup.object({
  name: yup.string().required(ValidationMessage.Required),
  barcode: yup.string().required(ValidationMessage.Required),
  cost: yup
    .number()
    .typeError(ValidationMessage.Number)
    .positive(ValidationMessage.Positive)
    .required(ValidationMessage.Required),
  basePrice: yup
    .number()
    .typeError(ValidationMessage.Number)
    .positive(ValidationMessage.Positive)
    .required(ValidationMessage.Required),
  minPrice: yup
    .number()
    .typeError(ValidationMessage.Number)
    .positive(ValidationMessage.Positive)
    .nullable()
    .optional()
    .transform((value, original) => (original === "" ? undefined : value)),
  category: yup
    .object({ label: yup.string().required(), value: yup.string().required() })
    .nullable()
    .required(ValidationMessage.Required),
  quantity: yup
    .number()
    .typeError(ValidationMessage.Number)
    .min(0, ValidationMessage.PositiveOrZero)
    .default(0),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const generateBarcode = (): string =>
  String(Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000);

const DEFAULT_VALUES: Partial<QuickCreateFormValues> = {
  name: "",
  barcode: "",
  cost: "",
  basePrice: "",
  minPrice: "",
  category: null,
  quantity: 0,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const QuickCreateItem: React.FC<QuickCreateProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const activeStore = useSelector(getStore);

  // Form -----------------------------------------------------------------------
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    control,
    setError,
    formState: { errors },
  } = useForm<QuickCreateFormValues>({
    resolver: yupResolver(QuickCreateSchema) as any,
    defaultValues: DEFAULT_VALUES,
  });

  // Image state ----------------------------------------------------------------
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission state -----------------------------------------------------------
  const [saving, setSaving] = useState(false);
  // "closeAfterSave" is set right before form submission so we know which
  // button triggered the save without needing two separate submit handlers.
  const closeAfterSaveRef = useRef(false);

  // Categories -----------------------------------------------------------------
  const {
    data: categories,
    fetchData: loadCategories,
    isLoading: loadingCategories,
  } = useApi<HydraCollection<Category>>(
    "categories-quick-create",
    CATEGORY_LIST,
    { isActive: true },
    "",
    "asc",
    1,
    999999,
    {},
    { enabled: false }
  );

  // Load categories when modal opens ------------------------------------------
  useEffect(() => {
    if (open) {
      loadCategories();
    }
  }, [open]);

  // ---------------------------------------------------------------------------
  // Image handling
  // ---------------------------------------------------------------------------

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Immediate local preview
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await request(MEDIA_UPLOAD, { method: "POST", body: formData });
      const data = await response.json();
      if (data.id) {
        setMediaId(data["@id"] || `/api/media/${data.id}`);
        notify({ type: "success", description: t("Image uploaded") });
      } else {
        throw new Error("No id in response");
      }
    } catch {
      notify({ type: "error", description: t("Image upload failed") });
      setImagePreview(null);
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setMediaId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ---------------------------------------------------------------------------
  // Form reset
  // ---------------------------------------------------------------------------

  const resetForm = () => {
    reset(DEFAULT_VALUES as QuickCreateFormValues);
    removeImage();
  };

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  const saveProduct = async (values: QuickCreateFormValues) => {
    setSaving(true);
    try {
      const storeIri = activeStore?.["@id"] ?? null;

      const storesPayload =
        values.quantity && storeIri
          ? [
              {
                store: storeIri,
                quantity: String(values.quantity),
                location: null,
                reOrderLevel: null,
              },
            ]
          : [];

      const hasStock = Number(values.quantity) > 0;

      await fetchJson(PRODUCT_CREATE, {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          barcode: values.barcode.toString(),
          cost: String(values.cost),
          basePrice: String(values.basePrice),
          minPrice: values.minPrice ? String(values.minPrice) : null,
          categories: values.category ? [values.category.value] : [],
          baseQuantity: 1,
          isAvailable: true,
          isActive: true,
          manageInventory: hasStock,
          prices: [],
          saleUnit: "unit",
          purchaseUnit: "unit",
          department: null,
          suppliers: [],
          brands: [],
          taxes: [],
          variants: [],
          stores: storesPayload,
          ...(mediaId ? { media: mediaId } : {}),
        }),
      });

      // Notify other parts of the app
      window.dispatchEvent(new Event("products-changed"));

      if (closeAfterSaveRef.current) {
        // "Save & Close" — reset form then close modal
        resetForm();
        onClose();
      } else {
        // "Save & Next" — show success, reset for next entry, keep modal open
        notify({
          type: "success",
          description: t("Product created successfully"),
        });
        resetForm();
      }
    } catch (exception: any) {
      await handleFormError(exception, { setError });
    } finally {
      setSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Modal close handler
  // ---------------------------------------------------------------------------

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="sm"
      title={t("Quick add product")}
      shouldCloseOnEsc
    >
      <form
        onSubmit={handleSubmit(saveProduct)}
        noValidate
        className="flex flex-col gap-4"
      >
        {/* ------------------------------------------------------------------ */}
        {/* Name                                                                */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <label htmlFor="qc-name" className="block mb-1 font-medium">
            {t("Name")} <span className="text-danger-500">*</span>
          </label>
          <Input
            {...register("name")}
            id="qc-name"
            className="w-full"
            hasError={hasErrors(errors.name)}
            autoFocus
            placeholder={t("Product name")}
          />
          {getErrors(errors.name)}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Barcode                                                             */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <label htmlFor="qc-barcode" className="block mb-1 font-medium">
            {t("Barcode")} <span className="text-danger-500">*</span>
          </label>
          <div className="input-group">
            <Input
              {...register("barcode")}
              id="qc-barcode"
              className="w-full"
              hasError={hasErrors(errors.barcode)}
              placeholder={t("Scan or enter barcode")}
            />
            <button
              type="button"
              tabIndex={-1}
              title={t("Auto-generate barcode")}
              className="btn btn-primary"
              onClick={() =>
                setValue("barcode", generateBarcode(), { shouldValidate: true })
              }
            >
              <FontAwesomeIcon icon={faRefresh} />
            </button>
          </div>
          {getErrors(errors.barcode)}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Price row: cost + basePrice                                         */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-2 gap-3">
          {/* Purchase price (PMP) */}
          <div>
            <label htmlFor="qc-cost" className="block mb-1 font-medium">
              {t("Purchase price (PMP)")} <span className="text-danger-500">*</span>
            </label>
            <div className="input-group">
              <span className="input-addon">{withCurrency(undefined)}</span>
              <Input
                {...register("cost")}
                id="qc-cost"
                type="number"
                className="w-full"
                hasError={hasErrors(errors.cost)}
                placeholder="0"
              />
            </div>
            {getErrors(errors.cost)}
          </div>

          {/* Sale price */}
          <div>
            <label htmlFor="qc-base-price" className="block mb-1 font-medium">
              {t("Sale price")} <span className="text-danger-500">*</span>
            </label>
            <div className="input-group">
              <span className="input-addon">{withCurrency(undefined)}</span>
              <Input
                {...register("basePrice")}
                id="qc-base-price"
                type="number"
                className="w-full"
                hasError={hasErrors(errors.basePrice)}
                placeholder="0"
              />
            </div>
            {getErrors(errors.basePrice)}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Price row: minPrice + quantity                                      */}
        {/* ------------------------------------------------------------------ */}
        <div className="grid grid-cols-2 gap-3">
          {/* Min sale price */}
          <div>
            <label htmlFor="qc-min-price" className="block mb-1 font-medium">
              {t("Min sale price")}
            </label>
            <div className="input-group">
              <span className="input-addon">{withCurrency(undefined)}</span>
              <Input
                {...register("minPrice")}
                id="qc-min-price"
                type="number"
                className="w-full"
                hasError={hasErrors(errors.minPrice)}
                placeholder="0"
              />
            </div>
            {getErrors(errors.minPrice)}
          </div>

          {/* Initial stock */}
          <div>
            <label htmlFor="qc-quantity" className="block mb-1 font-medium">
              {t("Initial stock")}
            </label>
            <Input
              {...register("quantity")}
              id="qc-quantity"
              type="number"
              className="w-full"
              hasError={hasErrors(errors.quantity)}
              placeholder="0"
            />
            {getErrors(errors.quantity)}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Category                                                            */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <label htmlFor="qc-category" className="block mb-1 font-medium">
            {t("Category")} <span className="text-danger-500">*</span>
          </label>
          <Controller
            name="category"
            control={control}
            render={({ field }) => (
              <ReactSelect
                inputId="qc-category"
                onChange={field.onChange}
                value={field.value}
                options={categories?.["hydra:member"]?.map((item) => ({
                  label: item.name,
                  value: item["@id"] ?? "",
                }))}
                isLoading={loadingCategories}
                placeholder={t("Select a category")}
                className={classNames(
                  getErrorClass(errors.category),
                  "rs-__container w-full"
                )}
              />
            )}
          />
          {getErrors(errors.category)}
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Product image                                                       */}
        {/* ------------------------------------------------------------------ */}
        <div>
          <label className="block mb-1 font-medium">{t("Product image")}</label>
          <div
            className={classNames("image-upload-zone", {
              "has-image": !!imagePreview,
            })}
            onClick={() => !imagePreview && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (!imagePreview && (e.key === "Enter" || e.key === " ")) {
                fileInputRef.current?.click();
              }
            }}
            aria-label={t("Upload product image")}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageUpload}
              style={{ display: "none" }}
            />

            {imagePreview ? (
              <div className="image-upload-preview">
                <img src={imagePreview} alt={t("Product image preview")} />
                <button
                  type="button"
                  className="image-upload-remove"
                  aria-label={t("Remove image")}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage();
                  }}
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
            ) : (
              <>
                <span className="upload-icon">
                  <FontAwesomeIcon icon={faCloudUploadAlt} />
                </span>
                <span className="upload-text">
                  {imageUploading
                    ? t("Uploading...")
                    : t("Click to add product image")}
                </span>
                <span className="upload-hint">JPEG, PNG, GIF, WebP — max 5 MB</span>
              </>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Action buttons                                                      */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            disabled={saving || imageUploading}
            onClick={() => {
              closeAfterSaveRef.current = false;
            }}
          >
            {saving && !closeAfterSaveRef.current
              ? t("Saving...")
              : t("Save & Next")}
          </Button>

          <Button
            type="submit"
            variant="secondary"
            className="flex-1"
            disabled={saving || imageUploading}
            onClick={() => {
              closeAfterSaveRef.current = true;
            }}
          >
            {saving && closeAfterSaveRef.current
              ? t("Saving...")
              : t("Save & Close")}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
