import { Controller, useFieldArray, useForm } from "react-hook-form";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CATEGORY_LIST,
  MEDIA_CONTENT,
  MEDIA_UPLOAD,
  PRODUCT_CREATE,
  PRODUCT_GET,
  TAX_LIST,
} from "../../../../../api/routing/routes/backend.app";
import { fetchJson, request } from "../../../../../api/request/request";
import { handleFormError } from "../../../../../lib/error/handle.form.error";
import { Input } from "../../../../../app-common/components/input/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudUploadAlt, faPlus, faRefresh, faTimes, faTrash } from "@fortawesome/free-solid-svg-icons";
import { Button } from "../../../../../app-common/components/input/button";
import { Category } from "../../../../../api/model/category";
import { Product } from "../../../../../api/model/product";
import { ReactSelect } from "../../../../../app-common/components/input/custom.react.select";
import { ReactSelectOptionProps } from "../../../../../api/model/common";
import { withCurrency } from "../../../../../lib/currency/currency";
import classNames from "classnames";
import { getErrorClass, getErrors, hasErrors } from "../../../../../lib/error/error";
import { Tax } from "../../../../../api/model/tax";
import { StoresInput } from "../../../../../app-common/components/input/stores";
import { Modal } from "../../../../../app-common/components/modal/modal";
import { notify } from "../../../../../app-common/components/confirm/notification";
import * as yup from 'yup';
import { ValidationMessage } from "../../../../../api/model/validation";
import { yupResolver } from "@hookform/resolvers/yup";
import { CreateTax } from "../../taxes/create.tax";
import { CreateCategory } from "../../categories/create.category";
import { Switch } from "../../../../../app-common/components/input/switch";
import useApi from "../../../../../api/hooks/use.api";
import { HydraCollection } from "../../../../../api/model/hydra";

interface ItemsCreateProps {
  entity?: Product;
  operation?: string;
  addModal: boolean;
  onClose?: () => void;
}

const ValidationSchema = yup.object({
  name: yup.string().required(ValidationMessage.Required),
  barcode: yup.string().required(ValidationMessage.Required),
  reference: yup.string().nullable(),
  basePrice: yup.string().required(ValidationMessage.Required),
  cost: yup.string().required(ValidationMessage.Required),
  minPrice: yup.string().nullable(),
  taxes: yup.array(),
  stores: yup.array(),
  categories: yup.array(),
});

export const CreateItem = ({
  entity, onClose, operation, addModal
}: ItemsCreateProps) => {
  const useFormHook = useForm({
    resolver: yupResolver(ValidationSchema)
  });

  const { register, handleSubmit, setError, formState: { errors }, reset, getValues, control, watch } = useFormHook;
  const { fields: variantFields, append: addVariant, remove: removeVariant } = useFieldArray({
    control,
    name: "variants"
  });
  const {t} = useTranslation();
  const [creating, setCreating] = useState(false);
  const [modal, setModal] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await request(MEDIA_UPLOAD, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.id) {
        setMediaId(data['@id'] || `/api/media/${data.id}`);
        notify({ type: 'success', description: t('Image uploaded') });
      } else if (data.error) {
        notify({ type: 'error', description: data.error });
        setImagePreview(null);
      }
    } catch (err) {
      notify({ type: 'error', description: t('Image upload failed. Check your permissions.') });
      setImagePreview(null);
    } finally {
      setImageUploading(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setMediaId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    setModal(addModal);
  }, [addModal]);

  const createProduct = async (values: any) => {
    setCreating(true);
    try {
      let url = PRODUCT_CREATE;
      let method = 'POST';
      if( values.id ) {
        method = 'PUT';
        url = PRODUCT_GET.replace(':id', values.id);
        if( values.variants ) {
          values.variants = values.variants.map((variant: any) => {
            if (variant['@id'] || variant.id) {
              // Existing variant — send as IRI
              return variant['@id'] || `/api/product_variants/${variant.id}`;
            }
            // New variant — send as nested object
            return {
              name: variant.name,
              attributeName: variant.attributeName,
              attributeValue: variant.attributeValue,
              price: variant.price || null,
              cost: variant.cost || null,
              minPrice: variant.minPrice || null,
              quantity: variant.quantity || '0',
              barcode: variant.barcode || null,
            };
          });
        }
      } else {
        delete values.id;
        if( values.variants ) {
          values.variants = values.variants.map((variant: any) => ({
            name: variant.name,
            attributeName: variant.attributeName,
            attributeValue: variant.attributeValue,
            price: variant.price || null,
            cost: variant.cost || null,
            minPrice: variant.minPrice || null,
            quantity: variant.quantity || '0',
            barcode: variant.barcode || null,
          }));
        }
      }

      if( values.categories ) {
        values.categories = values.categories.map((item: ReactSelectOptionProps) => item.value);
      }
      if( values.stores ) {
        values.stores = values.stores.filter((item: any) => item.quantity !== undefined).map((item: any) => ({
          store: item.store,
          location: item.location,
          quantity: item.quantity ? String(item.quantity) : "0",
          reOrderLevel: item.reOrderLevel ? String(item.reOrderLevel) : null,
          product: entity ? entity['@id'] : null
        }));
      }
      if( values.taxes ) {
        values.taxes = values.taxes.map((item: ReactSelectOptionProps) => item.value);
      } else {
        values.taxes = [];
      }
      if( values.barcode ) {
        values.barcode = values.barcode.toString();
      }

      await fetchJson(url, {
        method: method,
        body: JSON.stringify({
          ...values,
          baseQuantity: 1,
          isAvailable: true,
          isActive: true,
          prices: [],
          ...(mediaId ? { media: mediaId } : {}),
        })
      });

      onModalClose();

    } catch ( exception: any ) {
      await handleFormError(exception, { setError });
    } finally {
      setCreating(false);
    }
  };

  const {
    data: categories,
    fetchData: loadCategories,
    isLoading: loadingCategories
  } = useApi<HydraCollection<Category>>('categories', CATEGORY_LIST, {
    isActive: true
  }, '', 'asc', 1, 999999, {}, {
    enabled: false
  });
  const {
    data: taxes,
    fetchData: loadTaxes,
    isLoading: loadingTaxes
  } = useApi<HydraCollection<Tax>>('taxes', TAX_LIST, {
    isActive: true
  }, '', 'asc', 1, 999999, {}, {
    enabled: false
  });

  const [categoryModal, setCategoryModal] = useState(false);
  const [taxModal, setTaxModal] = useState(false);

  useEffect(() => {
    if(modal) {
      loadTaxes();
      loadCategories();
    }
  }, [modal]);

  useEffect(() => {
    if( entity ) {
      reset({
        ...entity,
        categories: entity.categories.map(item => ({
          label: item.name,
          value: item['@id']
        })),
        storesDropdown: entity.stores.map(item => ({
          label: item.store.name,
          value: item.store["@id"],
        })),
        stores: entity.stores.map(item => ({
          store: item.store['@id'],
          quantity: item.quantity,
          location: item.location,
          reOrderLevel: item.reOrderLevel
        })),
        taxes: entity.taxes.map(item => ({
          label: `${item.name} ${item.rate}%`,
          value: item['@id']
        })),
        variants: (entity as any).variants?.map((v: any) => ({
          '@id': v['@id'],
          id: v.id,
          name: v.name || '',
          attributeName: v.attributeName || '',
          attributeValue: v.attributeValue || '',
          price: v.price || '',
          cost: v.cost || '',
          minPrice: v.minPrice || '',
          quantity: v.quantity || '0',
          barcode: v.barcode || '',
        })) || [],
      });

      // Restore existing product image
      if ((entity as any).media) {
        const media = (entity as any).media;
        const id = typeof media === 'object' ? media.id : media;
        setMediaId(typeof media === 'object' ? media['@id'] : media);
        setImagePreview(MEDIA_CONTENT.replace(':id', id));
      }
    }
  }, [entity, reset]);

  const resetForm = () => {
    reset({
      barcode: null,
      reference: null,
      basePrice: null,
      baseQuantity: null,
      categories: [],
      cost: null,
      minPrice: null,
      id: null,
      name: null,
      prices: [],
      quantity: null,
      stores: [],
      taxes: [],
      variants: [],
      manageInventory: false
    });
  };

  const onModalClose = () => {
    resetForm();
    removeImage();
    onClose && onClose();
  }

  const stores = watch('storesDropdown');

  return (
    <>
      <Modal
        open={modal}
        onClose={onModalClose}
        size="full"
        title={operation === 'create' ? t('Create item') : t('Update item')}
      >
        <form onSubmit={handleSubmit(createProduct)} className="mb-5">
          <input type="hidden" {...register('id')}/>
          <div className="grid grid-cols-3 gap-4 gap-y-3 mb-4">
            {/* Row 1: Name + Barcode + Reference */}
            <div>
              <label htmlFor="name">{t("Name")}</label>
              <Input {...register('name')} id="name"
                     className={classNames("w-full")}
                     hasError={hasErrors(errors.name)}
              />
              {getErrors(errors.name)}
            </div>
            <div>
              <label htmlFor="barcode">{t("Barcode")}</label>
              <div className="input-group">
                <Input {...register('barcode')} id="barcode"
                       className={classNames("w-full")}
                       disabled={!!entity}
                       hasError={hasErrors(errors.barcode)}
                />
                {!entity && (
                  <button onClick={() => {
                    reset({
                      ...getValues(),
                      barcode: Math.floor(Math.random() * 10000000000) + 1
                    });
                  }} className="btn btn-primary" type="button"
                          tabIndex={-1}>
                    <FontAwesomeIcon icon={faRefresh}/>
                  </button>
                )}
              </div>
              {getErrors(errors.barcode)}
            </div>
            <div>
              <label htmlFor="reference">{t("Reference")}</label>
              <Input {...register('reference')} id="reference"
                     className={classNames("w-full")}
                     placeholder={t("Optional")}
              />
            </div>

            {/* Row 2: Image */}
            <div className="col-span-3" style={{ marginTop: '4px', marginBottom: '4px' }}>
              <label style={{ display: 'block', marginBottom: '6px' }}>{t("Product image")}</label>
              <div
                className={classNames('image-upload-zone', { 'has-image': !!imagePreview })}
                onClick={() => !imagePreview && fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageUpload}
                />
                {imagePreview ? (
                  <div className="image-upload-preview">
                    <img src={imagePreview} alt={t("Product image")} />
                    <button
                      type="button"
                      className="image-upload-remove"
                      onClick={(e) => { e.stopPropagation(); removeImage(); }}
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
                      {imageUploading ? t('Uploading...') : t('Click to add product image')}
                    </span>
                    <span className="upload-hint">JPEG, PNG, GIF, WebP — max 5 MB</span>
                  </>
                )}
              </div>
            </div>

            {/* Row 3: Prices — Sale price + Min price + Purchase price */}
            <div>
              <label htmlFor="basePrice">{t("Sale price")}</label>
              <div className="input-group">
                <span className="input-addon">{withCurrency(undefined)}</span>
                <Input {...register('basePrice')} id="basePrice" className={classNames("w-full")} hasError={hasErrors(errors.basePrice)}/>
              </div>
              {getErrors(errors.basePrice)}
            </div>
            <div>
              <label htmlFor="minPrice">{t("Minimum sale price")}</label>
              <div className="input-group">
                <span className="input-addon">{withCurrency(undefined)}</span>
                <Input {...register('minPrice')} id="minPrice" className={classNames("w-full")} hasError={hasErrors(errors.minPrice)}/>
              </div>
              <small className="text-muted">{t("Leave empty for fixed price")}</small>
              {getErrors(errors.minPrice)}
            </div>
            <div>
              <label htmlFor="cost">{t("Purchase price")}</label>
              <div className="input-group">
                <span className="input-addon">{withCurrency(undefined)}</span>
                <Input {...register('cost')} id="cost" className={classNames("w-full")} hasError={hasErrors(errors.cost)}/>
              </div>
              {getErrors(errors.cost)}
            </div>

            {/* Row 4: Categories + Taxes */}
            <div>
              <label htmlFor="categories">{t("Categories")}</label>
              <Controller
                name="categories"
                render={(props) => (
                  <div className="input-group">
                    <ReactSelect
                      options={categories?.['hydra:member']?.map(item => ({
                        label: item.name,
                        value: item['@id']
                      }))}
                      onChange={props.field.onChange}
                      value={props.field.value}
                      isMulti
                      className={classNames(getErrorClass(errors.categories), 'flex-grow rs-__container')}
                      isLoading={loadingCategories}
                    />
                    <button className="btn btn-primary" type={"button"} onClick={() => setCategoryModal(true)}>
                      <FontAwesomeIcon icon={faPlus}/>
                    </button>
                  </div>
                )}
                control={control}
              />
              {getErrors(errors.categories)}
            </div>
            <div>
              <label htmlFor="taxes">{t("Taxes")}</label>
              <Controller
                name="taxes"
                render={(props) => (
                  <div className="input-group">
                    <ReactSelect
                      options={taxes?.['hydra:member']?.map(item => ({
                        label: `${item.name} ${item.rate}%`,
                        value: item['@id']
                      }))}
                      onChange={props.field.onChange}
                      value={props.field.value}
                      isMulti
                      className={classNames(getErrorClass(errors.taxes), 'flex-grow rs-__container')}
                      isLoading={loadingTaxes}
                    />
                    <button className="btn btn-primary" type={"button"} onClick={() => setTaxModal(true)}>
                      <FontAwesomeIcon icon={faPlus}/>
                    </button>
                  </div>
                )}
                control={control}
              />
              {getErrors(errors.taxes)}
            </div>
            <div className="flex items-end">
              <Controller
                control={control}
                name="manageInventory"
                render={(props) => (
                  <Switch
                    checked={props.field.value}
                    onChange={props.field.onChange}
                  >
                    {t("Manage inventory?")}
                  </Switch>
                )}
              />
              {getErrors(errors.manageInventory)}
            </div>

            {/* Row 5: Stores / Stock */}
            <div className="col-span-3">
              <StoresInput control={control} errors={errors} name="storesDropdown" />
            </div>
            {getValues('storesDropdown')?.length > 0 && (
              <div className="col-span-3">
                <div className="grid grid-cols-2 gap-3 font-bold">
                  <div>{t("Store")}</div>
                  <div>{t("Stock")}</div>
                </div>
              </div>
            )}

            <div className="col-span-3">
              {stores?.map((store: any, index: number) => (
                <div key={index} className="grid grid-cols-2 mb-3 gap-3 hover:bg-gray-200">
                  <div className="flex items-center">
                    <input type="hidden" {...register(`stores.${index}.store`)} value={store.value} />
                    {store.label}
                  </div>
                  <div>
                    <Controller
                      render={({field}) => (
                        <Input type="number" placeholder={t("Stock")} onChange={field.onChange} value={field.value} className="w-full" />
                      )}
                      name={`stores.${index}.quantity`}
                      control={control}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* ─── Variants (optional) ─── */}
            <div className="col-span-3 border-t pt-4 mt-2">
              <div className="flex justify-between items-center mb-3">
                <label className="font-bold text-lg">
                  {t("Variants")} <span className="text-muted text-sm font-normal">({t("Optional")})</span>
                </label>
                <Button type="button" variant="primary" onClick={() => addVariant({
                  name: '', price: '', cost: '', minPrice: '', quantity: '0',
                  barcode: String(Math.floor(Math.random() * 9_000_000_000) + 1_000_000_000),
                })}>
                  <FontAwesomeIcon icon={faPlus} className="me-2" />
                  {t("Add variant")}
                </Button>
              </div>

              {variantFields.length > 0 && (
                <div className="grid grid-cols-12 gap-2 mb-2 font-bold text-sm">
                  <div className="col-span-3">{t("Variant name")}</div>
                  <div className="col-span-2">{t("Price")}</div>
                  <div className="col-span-2">{t("Cost (PMP)")}</div>
                  <div className="col-span-1">{t("Min Price")}</div>
                  <div className="col-span-1">{t("Stock")}</div>
                  <div className="col-span-2">{t("Barcode")}</div>
                  <div className="col-span-1"></div>
                </div>
              )}

              {variantFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 mb-2 items-center">
                  <div className="col-span-3">
                    <Input {...register(`variants.${index}.name`)} placeholder={t("ex: 10kg, Large, Red...")} className="w-full" />
                  </div>
                  <div className="col-span-2">
                    <div className="input-group">
                      <span className="input-addon">{withCurrency(undefined)}</span>
                      <Input {...register(`variants.${index}.price`)} placeholder="0" className="w-full" />
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Input {...register(`variants.${index}.cost`)} placeholder={t("Auto")} className="w-full" />
                  </div>
                  <div className="col-span-1">
                    <Input {...register(`variants.${index}.minPrice`)} placeholder="0" className="w-full" />
                  </div>
                  <div className="col-span-1">
                    <Input {...register(`variants.${index}.quantity`)} type="number" placeholder="0" className="w-full" />
                  </div>
                  <div className="col-span-2">
                    <Input {...register(`variants.${index}.barcode`)} className="w-full" />
                  </div>
                  <div className="col-span-1">
                    <Button type="button" variant="danger" className="w-[40px]" onClick={() => removeVariant(index)}>
                      <FontAwesomeIcon icon={faTrash} />
                    </Button>
                  </div>
                </div>
              ))}

              {variantFields.length === 0 && (
                <p className="text-muted text-sm">{t("No variants added. Click 'Add variant' to create size, color or other variations.")}</p>
              )}
            </div>
          </div>
          <Button variant="primary" type="submit"
                  disabled={creating}>{creating ? t('Saving...') : (operation === 'create' ? t('Create new') : t('Update'))}</Button>
        </form>
      </Modal>

      <CreateTax addModal={taxModal} operation="create" onClose={() => {
        setTaxModal(false);
        loadTaxes();
      }}/>

      <CreateCategory addModal={categoryModal} operation="create" onClose={() => {
        setCategoryModal(false);
        loadCategories();
      }}/>
    </>
  );
};
