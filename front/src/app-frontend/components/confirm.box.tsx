import React, {ReactNode, useEffect, useState} from 'react';
import { Modal } from '../../app-common/components/modal/modal';
import {useTranslation} from "react-i18next";


interface ConfirmBoxProps {
  onAccept?: Function;
  onCancel?: Function;
  acceptText?: string;
  cancelText?: string;
  title?: string;
  body?: ReactNode;
  state?: boolean;
  onHide?: Function;
}

export const ConfirmBox = (props: ConfirmBoxProps) => {
  const {t} = useTranslation();
  const [show, setShow] = useState<boolean | undefined>(false);

  useEffect(() => {
    setShow(props.state);
  }, [props.state]);

  const handleClose = () => {
    setShow(false);
    if (props.onCancel) {
      props.onCancel();
    }

    if (props.onHide) {
      props.onHide();
    }
  };

  const handleOk = () => {
    setShow(false);
    if (props.onAccept) {
      props.onAccept();
    }

    if (props.onHide) {
      props.onHide();
    }
  };

  const handleHide = () => {
    setShow(false);
    if (props.onHide) {
      props.onHide();
    }
  };

  return (
    <>
      <Modal open={show} onClose={handleHide} title={props?.title ? props.title : t('Are you sure?')}>

        {props?.body}
        <div className="flex justify-end items-center">
          <button type="button" onClick={handleClose} className="btn">
            {props?.cancelText ? props.cancelText : t('Cancel')}
          </button>
          <button type="button" onClick={handleOk} className="btn btn-primary">
            {props?.acceptText ? props.acceptText : t('Yes Please')}
          </button>
        </div>
      </Modal>
    </>
  );
};
