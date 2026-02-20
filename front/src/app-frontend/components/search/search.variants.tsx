import classNames from "classnames";
import { getRealProductPrice } from "../../containers/dashboard/pos";
import { Modal } from "../../../app-common/components/modal/modal";
import { Product } from "../../../api/model/product";
import { ProductVariant } from "../../../api/model/product.variant";
import { useAtom } from "jotai";
import { defaultState } from "../../../store/jotai";
import Mousetrap from "mousetrap";
import { useTranslation } from "react-i18next";

interface Props{
  modal: boolean;
  onClose: () => void;
  variants: ProductVariant[];
  addItemVariant: (item: Product,
    variant: ProductVariant,
    quantity: number,
    price?: number) => void;
  addItemBase?: (item: Product, quantity: number) => void;
  items: Product[];
}
export const SearchVariants = ({
  modal, onClose, variants, addItemVariant, addItemBase, items
}: Props) => {
  const [appState, setAppState] = useAtom(defaultState);
  const { t } = useTranslation();

  const {
    selectedVariant,
    latest,
    quantity,
    selected
  } = appState;

  // Total options = 1 (base product) + variants
  const totalOptions = variants.length + 1;

  const moveVariantsCursor = async (event: any) => {
    if( event.key === "ArrowDown" ) {
      let newSelected = selectedVariant + 1;
      if( newSelected >= totalOptions ) {
        newSelected = 0;
      }
      setAppState((prev) => ({
        ...prev,
        selectedVariant: newSelected,
      }));
    } else if( event.key === "ArrowUp" ) {
      let newSelected = selectedVariant - 1;
      if( newSelected < 0 ) {
        newSelected = totalOptions - 1;
      }
      setAppState((prev) => ({
        ...prev,
        selectedVariant: newSelected,
      }));
    } else if( event.key === "Enter" ) {
      if (selectedVariant === 0) {
        // Base product selected
        if (addItemBase && latest) {
          addItemBase(latest, quantity);
        }
      } else {
        addItemVariant(
          items[selected],
          items[selected].variants[selectedVariant - 1],
          1
        );
      }
    }
  };

  Mousetrap.bind(["up", "down", "enter"], function (e: Event) {
    if( modal ) {
      moveVariantsCursor(e);
    }
  });

  return (
    <Modal
      open={modal}
      onClose={onClose}
      title={`${t("Choose a variant for")} ${latest?.name}`}
      hideCloseButton={true}
      shouldCloseOnOverlayClick={false}
    >
      <div className="table w-full">
        <div className="table-header-group">
          <div className="table-row">
            <div className="table-cell p-5 text-start font-bold">{t("Product")}</div>
            <div className="table-cell p-5 text-end font-bold">{t("Price")}</div>
          </div>
        </div>
        <div className="table-row-group">
          {/* Base product — always first */}
          {latest && (
            <div
              className={classNames(
                "table-row hover:bg-blue-50 cursor-pointer",
                selectedVariant === 0 ? "bg-blue-100" : ""
              )}
              onClick={() => {
                if (addItemBase) {
                  addItemBase(latest, quantity);
                }
              }}
            >
              <div className="table-cell p-5">
                <div className="font-bold">{latest.name}</div>
                <div className="text-gray-400 text-sm">{t("Base product")}</div>
              </div>
              <div className="table-cell p-5 text-end font-bold">
                {getRealProductPrice(latest)}
              </div>
            </div>
          )}

          {/* Variants */}
          {variants.map((item, index) => (
            <div
              className={classNames(
                "table-row hover:bg-gray-200 cursor-pointer",
                selectedVariant === index + 1 ? "bg-gray-300" : ""
              )}
              onClick={() => addItemVariant(latest!, item, quantity)}
              key={index}>
              <div className="table-cell p-5">
                {item.name}
                {item.barcode && (
                  <div className="text-gray-400 text-sm">{item.barcode}</div>
                )}
              </div>
              <div className="table-cell p-5 text-end">
                {item.price === null ? (
                  <>{getRealProductPrice(latest!)}</>
                ) : (
                  <>{item.price}</>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
