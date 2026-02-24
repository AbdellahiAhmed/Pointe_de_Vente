import React, {FC, useEffect, useState} from "react";
import {Modal} from "../../../../app-common/components/modal/modal";
import {useForm} from "react-hook-form";
import {BRAND_CREATE, BRAND_EDIT, STORE_EDIT} from "../../../../api/routing/routes/backend.app";
import {ReactSelectOptionProps} from "../../../../api/model/common";
import {fetchJson} from "../../../../api/request/request";
import {handleFormError} from "../../../../lib/error/handle.form.error";
import {Input} from "../../../../app-common/components/input/input";
import {Trans, useTranslation} from "react-i18next";
import { StoresInput } from "../../../../app-common/components/input/stores";
import {Button} from '../../../../app-common/components/input/button';
import {Brand} from "../../../../api/model/brand";
import * as yup from 'yup';
import {ValidationMessage} from "../../../../api/model/validation";
import {yupResolver} from "@hookform/resolvers/yup";
import {hasErrors} from "../../../../lib/error/error";
import {notify} from "../../../../app-common/components/confirm/notification";

interface CreateBrandProps{
  entity?: Brand;
  operation?: string;
  addModal: boolean;
  onClose?: () => void;
}

const ValidationSchema = yup.object({
  name: yup.string().required(ValidationMessage.Required),
  stores: yup.array().required(ValidationMessage.Required)
}).required();

export const CreateBrand: FC<CreateBrandProps> = ({
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
        stores: entity.stores.map(item => {
          return {
            label: item.name,
            value: item['@id']
          }
        })
      });
    }
  }, [entity]);

  const createBrand = async (values: any) => {
    setCreating(true);
    try {
      let url, method = 'POST';
      if (values.id) {
        method = 'PUT';
        url = BRAND_EDIT.replace(':id', values.id);
      } else {
        url = BRAND_CREATE;
        delete values.id;
      }

      if(values.stores){
        values.stores = values.stores.map((item: ReactSelectOptionProps) => item.value);
      }

      await fetchJson(url, {
        method: method,
        body: JSON.stringify({
          ...values,
          isActive: true
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
      title={operation === 'create' ? t('Create brand') : t('Update brand')}
    >
      <form onSubmit={handleSubmit(createBrand)} className="mb-5">
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
          <StoresInput control={control} errors={errors} />
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
