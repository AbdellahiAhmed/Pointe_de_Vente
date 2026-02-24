import React, { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import classNames from "classnames";
import { Input } from "../../../app-common/components/input/input";
import { CartItem as CartItemModel } from "../../../api/model/cart.item";
import { getRowTotal } from "../../containers/dashboard/pos";
import { Checkbox } from "../../../app-common/components/input/checkbox";
import { useAtom } from "jotai";
import { defaultState } from "../../../store/jotai";
import { formatNumber, withCurrency } from "../../../lib/currency/currency";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus, faUndo } from "@fortawesome/free-solid-svg-icons";
import QueryString from "qs";
import { jsonRequest } from "../../../api/request/request";
import { PRODUCT_QUANTITIES } from "../../../api/routing/routes/backend.app";
import { useSelector } from "react-redux";
import { getStore } from "../../../duck/store/store.selector";
// @ts-ignore
import Spinner from "../../../assets/images/spinner.svg";
import { CartItemType } from "./cart.container";
import { KeyboardInput } from "../../../app-common/components/input/keyboard.input";
import {useTranslation} from "react-i18next";

interface CartItemProps {
  onQuantityChange: (item: CartItemModel, quantity: any) => void;
  onDiscountChange: (item: CartItemModel, discount: number) => void;
  onPriceChange: (item: CartItemModel, price: number) => void;
  deleteItem: (index: number) => void;
  item: CartItemModel;
  index: number;
  onCheck: (state: boolean, index: number) => void;
}

interface ItemInfo {
  quantity: string;
}

export const CartItem: FunctionComponent<CartItemProps> = ({
  onQuantityChange,
  onPriceChange,
  onDiscountChange,
  onCheck,
  item,
  index,
}) => {
  const {t} = useTranslation();
  const [isLoading, setLoading] = useState(false);
  const [itemInfo, setItemInfo] = useState<ItemInfo>();
  const [appState, setAppState] = useAtom(defaultState);
  const { cartItemType, cartItem, refundingFrom } = appState;
  const isReturnMode = !!refundingFrom;
  const taxTotal = useMemo(() => {
    return item.taxes.reduce(
      (prev, tax) => prev + (tax.rate * item.price) / 100,
      0
    );
  }, [item]);

  const store = useSelector(getStore);

  const getItemsMetadata = async (itemId: number, variantId?: number) => {
    setLoading(true);
    try {
      const search = QueryString.stringify({
        itemId,
        variantId,
        store: store?.id,
      });
      const response = await jsonRequest(`${PRODUCT_QUANTITIES}?${search}`);
      const json = await response.json();

      setItemInfo(json);

    } catch {
      // Non-critical: stock quantity display fails silently
    } finally {
      setLoading(false);
    }
  }

  let qtyRef = useRef<HTMLInputElement>();
  let discRef = useRef<HTMLInputElement>();
  let rateRef = useRef<HTMLInputElement>();

  useEffect(() => {
    if( cartItem === index ) {
      if( cartItemType === "quantity" ) {
        qtyRef.current?.focus();
        qtyRef.current?.select();
      }

      if( cartItemType === "discount" ) {
        discRef.current?.focus();
        discRef.current?.select();
      }

      if( cartItemType === "rate" ) {
        rateRef.current?.focus();
        rateRef.current?.select();
      }
    }
  }, [cartItem, cartItemType, index]);

  useEffect(() => {
    if( item.item.manageInventory ) {
      getItemsMetadata(item.item.id, item?.variant?.id);
    }
  }, [item]);

  return (
    <div className={classNames("table-row hover:bg-gray-200", isReturnMode && "return-cart-row")} key={index}>
      <div className="table-cell p-2">
        <Checkbox
          checked={item.checked}
          onChange={(event) => onCheck(event.currentTarget.checked, index)}
          id={index.toString()}
          tabIndex={-1}
          className="align-middle"
        />
      </div>
      <div className="table-cell p-1">
        <label htmlFor={index.toString()}>
          <div className="flex items-center gap-1">
            {isReturnMode && <FontAwesomeIcon icon={faUndo} className="text-danger-500 text-xs" />}
            <span>{item.variant?.name || item.item.name}</span>
          </div>
          {item.variant && (
            <div className="text-sm text-primary-800">
              {item.item.name}
            </div>
          )}
        </label>
      </div>
      <div className="table-cell p-1 text-center">
        {item.item.manageInventory && (
          <>
            {isLoading ? (
              <img alt={t("loading...")} src={Spinner} className="w-[16px]"/>
            ) : (
              <span
                className={Number(itemInfo?.quantity) <= 0 ? 'text-danger-500 animated blink' : ''}>{itemInfo?.quantity}</span>
            )}
          </>
        )}
      </div>
      <div className="table-cell p-1">
        <div className="flex items-center justify-center gap-1">
          {isReturnMode ? (
            <>
              <button
                type="button"
                tabIndex={-1}
                className="pos-cart-qty-btn"
                onClick={() => onQuantityChange(item, Number(item.quantity) + 1)}>
                <FontAwesomeIcon icon={faMinus} />
              </button>
              <input
                type="number"
                value={Math.abs(item.quantity)}
                className="pos-cart-qty-input mousetrap return-qty"
                onChange={(event) => {
                  const val = Math.abs(Number(event.currentTarget.value));
                  onQuantityChange(item, val === 0 ? -1 : -val);
                }}
                onFocus={() => {
                  setAppState(prev => ({
                    ...prev,
                    cartItem: index,
                    cartItemType: CartItemType.quantity
                  }));
                }}
                ref={qtyRef}
                min={1}
              />
              <button
                type="button"
                tabIndex={-1}
                className="pos-cart-qty-btn"
                onClick={() => onQuantityChange(item, Number(item.quantity) - 1)}>
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                tabIndex={-1}
                className="pos-cart-qty-btn"
                onClick={() => onQuantityChange(item, Number(item.quantity) - 1)}>
                <FontAwesomeIcon icon={faMinus} />
              </button>
              <input
                type="number"
                value={item.quantity}
                className="pos-cart-qty-input mousetrap"
                onChange={(event) => {
                  onQuantityChange(item, event.currentTarget.value)
                }}
                onFocus={() => {
                  setAppState(prev => ({
                    ...prev,
                    cartItem: index,
                    cartItemType: CartItemType.quantity
                  }));
                }}
                ref={qtyRef}
              />
              <button
                type="button"
                tabIndex={-1}
                className="pos-cart-qty-btn"
                onClick={() => onQuantityChange(item, Number(item.quantity) + 1)}>
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="table-cell text-center p-1">
        <Input
          type="number"
          value={item.discount}
          className={"text-center w-full mousetrap"}
          onChange={(event) => {
            onDiscountChange(item, +event.currentTarget.value);
          }}
          ref={discRef}
          onFocus={() => {
            setAppState(prev => ({
              ...prev,
              cartItem: index,
              cartItemType: CartItemType.discount
            }))
          }}
        />
      </div>
      <div className="table-cell p-2 text-center">
        {item.taxIncluded ? (
          taxTotal
        ) : (
          <span className="line-through">{withCurrency(taxTotal)}</span>
        )}
      </div>
      <div className="table-cell text-center p-1 tabular-nums whitespace-nowrap">
        {formatNumber(item.price)}
      </div>
      <div className={classNames("table-cell p-2 text-end tabular-nums whitespace-nowrap", isReturnMode && "text-danger-500")}>
        {isReturnMode ? formatNumber(Math.abs(getRowTotal(item))) : formatNumber(getRowTotal(item))}
      </div>
    </div>
  );
};
