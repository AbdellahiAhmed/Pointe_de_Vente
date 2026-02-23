import { Button } from "../../../app-common/components/input/button";
import { Modal } from "../../../app-common/components/modal/modal";
import React, { FC, PropsWithChildren, useEffect, useState } from "react";
import { Tax } from "../../../api/model/tax";
import { useLoadData } from "../../../api/hooks/use.load.data";
import { Shortcut } from "../../../app-common/components/input/shortcut";
import { CartItem } from "../../../api/model/cart.item";
import { useAtom } from "jotai";
import { defaultState } from "../../../store/jotai";
import {useTranslation} from "react-i18next";

interface TaxProps extends PropsWithChildren {}

export const ApplyTax: FC<TaxProps> = ({ children }) => {
  const {t} = useTranslation();
  const [appState, setAppState] = useAtom(defaultState);
  const { tax, added } = appState;
  const [modal, setModal] = useState(false);
  const [taxList, setTaxList] = useState<Tax[]>([]);

  const [state, action] = useLoadData();

  const loadTaxList = async () => {
    if (state.taxList.list) {
      setTaxList(state.taxList.list);
    }
  };

  useEffect(() => {
    loadTaxList();
  }, [state.taxList]);

  return (
    <>
      <button
        className="block w-full text-start"
        onClick={() => {
          setModal(true);
        }}
        type="button"
        disabled={added.length === 0}>
        {children || t("Taxes")}
        <Shortcut actionId="open_taxes" handler={() => setModal(true)} />
      </button>
      <Modal
        open={modal}
        onClose={() => {
          setModal(false);
        }}
        title={t("Apply Tax")}
        shouldCloseOnEsc={true}>
        <Button
          variant="danger"
          onClick={() => {
            setAppState((prev) => ({
              ...prev,
              data: undefined,
            }));
            setModal(false);
          }}
          className="me-3 mb-3"
          size="lg">
          {t("Clear Tax")}
        </Button>

        {taxList.map((taxItem, index) => (
          <Button
            variant="primary"
            key={index}
            onClick={() => {
              setAppState((prev) => ({
                ...prev,
                tax: taxItem,
              }));
              setModal(false);
            }}
            className="me-3 mb-3"
            active={taxItem.id === tax?.id}
            size="lg">
            {taxItem.name} {taxItem.rate}%
          </Button>
        ))}
      </Modal>
    </>
  );
};
