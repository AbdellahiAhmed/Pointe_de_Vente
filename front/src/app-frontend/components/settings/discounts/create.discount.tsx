import React, {FC, useEffect, useState} from "react";
import {Modal} from "../../../../app-common/components/modal/modal";
import {Controller, useForm} from "react-hook-form";
import {DISCOUNT_CREATE, DISCOUNT_GET} from "../../../../api/routing/routes/backend.app";
import {ReactSelectOptionProps} from "../../../../api/model/common";
import {fetchJson} from "../../../../api/request/request";
import {handleFormError} from "../../../../lib/error/handle.form.error";
import {Discount} from "../../../../api/model/discount";
import {Trans, useTranslation} from "react-i18next";
import {ReactSelect} from "../../../../app-common/components/input/custom.react.select";
import {StoresInput} from "../../../../app-common/components/input/stores";
import {Button} from "../../../../app-common/components/input/button";
import {Input} from "../../../../app-common/components/input/input";
import * as yup from "yup";
import {ValidationMessage} from "../../../../api/model/validation";
import {yupResolver} from "@hookform/resolvers/yup";
import {hasErrors} from "../../../../lib/error/error";
import {notify} from "../../../../app-common/components/confirm/notification";

interface CreateDiscountProps {
  entity?: Discount;
  operation?: string;
  addModal: boolean;
  onClose?: () => void;
}

const ValidationSchema = yup.object({
  name: yup.string().required(ValidationMessage.Required),
  type: yup.object({
    label: yup.string(),
    value: yup.string()
  }).required(ValidationMessage.Required),
  scope: yup.object({
    label: yup.string(),
    value: yup.string()
  }).required(ValidationMessage.Required),
  stores: yup.array().required(ValidationMessage.Required)
});

export const CreateDiscount: FC<CreateDiscountProps> = ({
  entity, onClose, operation, addModal
}) => {
  const {register, handleSubmit, setError, formState: {errors}, reset, control} = useForm({
    resolver: yupResolver(ValidationSchema)
  });
  const {t} = useTranslation();
  const [creating, setCreating] = useState(false);
  const [modal, setModal] = useState(false);

  useEffect(() => {
    setModal(addModal);
  }, [addModal]);

  useEffect(() => {
    if (entity) {
      reset({
        ...entity,
        rateType: {
          label: entity.rateType,
          value: entity.rateType
        },
        scope: {
          label: entity.scope,
          value: entity.scope,
        },
        stores: entity.stores.map(item => ({
          label: item.name,
          value: item['@id']
        }))
      });
    }
  }, [entity]);


  const createDiscount = async (values: any) => {
    setCreating(true);
    try {
      let url, method = 'POST';
      if (values.id) {
        method = 'PUT'
        url = DISCOUNT_GET.replace(':id', values.id);
      } else {
        url = DISCOUNT_CREATE;
        delete values.id;
      }

      if (values.stores) {
        values.stores = values.stores.map((item: ReactSelectOptionProps) => item.value);
      }

      if (values.rateType) {
        values.rateType = values.rateType.value;
      }

      if (values.scope) {
        values.scope = values.scope.value;
      }

      if(values.rate === ''){
        delete values.rate;
      }

      await fetchJson(url, {
        method: method,
        body: JSON.stringify({
          ...values,
        })
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
      rate: null,
      rateType: null,
      scope: null,
      name: null,
      stores: null
    });
  };

  const onModalClose = () => {
    resetForm();
    onClose && onClose();
  }

  return (
    <Modal
      open={modal}
      onClose={onModalClose}
      size="sm"
      title={operation === 'create' ? t('Create discount') : t('Update discount')}
    >
      <form onSubmit={handleSubmit(createDiscount)} className="mb-5">
        <input type="hidden" {...register('id')}/>
        <div className="grid grid-cols-1 gap-4 mb-3">
          <div>
            <label htmlFor="name">{t("Name")}</label>
            <Input {...register('name')} id="name" className="w-full" hasError={hasErrors(errors.name)}/>
            {errors.name && (
              <div className="text-danger-500 text-sm">
                <Trans>
                  {errors.name.message}
                </Trans>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="rate">{t("Rate")}</label>
            <Input {...register('rate')} id="rate" className="w-full" hasError={hasErrors(errors.rate)}/>
            {errors.rate && (
              <div className="text-danger-500 text-sm">
                <Trans>
                  {errors.rate.message}
                </Trans>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="rateType">{t("Rate type")}</label>
            <Controller
              name="rateType"
              control={control}
              render={(props) => (
                <ReactSelect
                  onChange={props.field.onChange}
                  value={props.field.value}
                  options={[{
                    label: 'percent',
                    value: 'percent'
                  }, {
                    label: 'fixed',
                    value: 'fixed'
                  }]}
                />
              )}
            />
            {errors.rateType && (
              <div className="text-danger-500 text-sm">
                <Trans>
                  {errors.rateType.message}
                </Trans>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="scope">{t("Discount type")}</label>
            <Controller
              name="scope"
              control={control}
              render={(props) => (
                <ReactSelect
                  onChange={props.field.onChange}
                  value={props.field.value}
                  options={[{
                    label: 'exact',
                    value: 'exact'
                  }, {
                    label: 'open',
                    value: 'open'
                  }]}
                />
              )}
            />
            {errors.scope && (
              <div className="text-danger-500 text-sm">
                <Trans>
                  {errors.scope.message}
                </Trans>
              </div>
            )}
          </div>

          <StoresInput control={control} errors={errors}/>

          <div>
            <Button variant="primary" type="submit" disabled={creating}>
              {creating ? t('Saving...') : (operation === 'create' ? t('Create new') : t('Update'))}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
