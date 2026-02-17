import {Popover} from "antd";
import { PropsWithChildren, ReactNode, useState } from "react";
import {useTranslation} from "react-i18next";

interface ConfirmAlertProps extends PropsWithChildren{
  onConfirm: () => void,
  confirmText?: string,
  cancelText?: string,
  description?: ReactNode,
  title: ReactNode
}

export const ConfirmAlert = (params: ConfirmAlertProps) => {
  const {onConfirm, confirmText, cancelText, description, title, children} = params;
  const [open, setOpen] = useState(false);
  const {t} = useTranslation();

  return (
    <Popover
      placement="topRight"
      title={<h4 className="text-lg mb-3">{title}</h4>}
      content={
        <ConfirmAlertButtons
          onConfirm={onConfirm}
          confirmText={confirmText}
          cancelText={cancelText}
          description={description}
          onCancel={() => {
            setOpen(false);
          }}
        />
      }
      trigger="click"
      onOpenChange={setOpen}
      open={open}
    >
      {children}
    </Popover>
  );
};

interface ConfirmAlertButtonsProps{
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

const ConfirmAlertButtons = ({
  description, confirmText, onConfirm, onCancel, cancelText
}: ConfirmAlertButtonsProps) => {
  const {t} = useTranslation();
  return (
    <>
      {description && (
        <p className="mb-3">{description}</p>
      )}
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn btn-secondary btn-flat" autoFocus={true}>{cancelText||t('Cancel')}</button>
        <button onClick={onConfirm} className="btn btn-danger btn-flat">{confirmText||t('Delete')}</button>
      </div>
    </>
  )
}
