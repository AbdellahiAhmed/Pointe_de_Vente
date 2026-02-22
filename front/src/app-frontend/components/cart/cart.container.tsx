import React, {
  FunctionComponent,
  useCallback,
  useMemo,
  useState,
} from "react";
import { CartItem as CartItemModel } from "../../../api/model/cart.item";
import { Product } from "../../../api/model/product";
import { CartItem } from "./cart.item";
import { Checkbox } from "../../../app-common/components/input/checkbox";
import Mousetrap from "mousetrap";
import { withCurrency } from "../../../lib/currency/currency";
import { useAtom } from "jotai";
import { defaultState } from "../../../store/jotai";
import { notify } from "../../../app-common/components/confirm/notification";
import { subTotal } from "../../containers/dashboard/pos";
import {useTranslation} from "react-i18next";
import { useSelector } from "react-redux";
import { getStore } from "../../../duck/store/store.selector";

interface CartContainerProps {

}

export enum CartItemType {
  quantity = "quantity",
  discount = "discount",
  rate = "rate",
}

export const CartContainer: FunctionComponent<CartContainerProps> = ({

}) => {
  const {t} = useTranslation();
  const [appState, setAppState] = useAtom(defaultState);
  const { added, cartItemType, cartItem } = appState;
  const store = useSelector(getStore);

  const getAvailableStock = (item: CartItemModel): number => {
    const product = item.item;
    if (!product.manageInventory) return Infinity;
    if (store && product.stores?.length > 0) {
      const ps = product.stores.find(s => s.store?.id === store.id);
      return ps ? Number(ps.quantity || 0) : 0;
    }
    return product.stores?.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
      ?? product.quantity ?? 0;
  };

  const onCheckAll = (e: any) => {
    const newAdded = [...added];
    newAdded.map((item) => (item.checked = e.target.checked));

    setAppState((prev) => ({
      ...prev,
      added: newAdded,
    }));
  };

  const onCheck = (state: boolean, index: number) => {
    const items = [...added];

    items[index].checked = state;

    setAppState((prev) => ({
      ...prev,
      added: items,
    }));
  };

  const allChecked = useMemo(() => {
    return (
      added.length > 0 &&
      added.length === added.filter((item) => item.checked).length
    );
  }, [added]);

  const indeterminate = useMemo(() => {
    const checked = added.filter((item) => item.checked).length;
    const nonChecked = added.filter((item) => !item.checked).length;

    return (
      added.length > 0 &&
      checked > 0 &&
      nonChecked > 0 &&
      added.length !== checked
    );
  }, [added]);

  const onQuantityChange = (item: CartItemModel, newQuantity: number) => {
    const oldItems = [...added];
    let index = oldItems.findIndex(
      (addItem) =>
        addItem.item.id === item.item.id && item.variant === addItem.variant
    );
    if (index !== -1) {
      if (newQuantity <= 0) {
        notify({
          type: "error",
          description: t("Quantity cannot be less then 1"),
        });
        return false;
      }

      // Stock validation
      const available = getAvailableStock(oldItems[index]);
      if (available !== Infinity && Number(newQuantity) > available) {
        notify({
          type: "error",
          title: t("Stock insufficient"),
          description: `${item.item.name}: ${t("available")} ${available}`,
          placement: "top",
          duration: 3,
        });
        return false;
      }

      oldItems[index].quantity = Number(newQuantity);
    }

    setAppState((prev) => ({
      ...prev,
      added: oldItems,
    }));
  };

  const onPriceChange = (item: CartItemModel, newPrice: number) => {
    const oldItems = [...added];
    let index = oldItems.findIndex(
      (addItem) =>
        addItem.item.id === item.item.id && item.variant === addItem.variant
    );
    if (index !== -1) {
      oldItems[index].price = newPrice;
    }

    setAppState((prev) => ({
      ...prev,
      added: oldItems,
    }));
  };

  const onDiscountChange = (item: CartItemModel, newDiscount: number) => {
    const oldItems = [...added];
    let index = oldItems.findIndex(
      (addItem) =>
        addItem.item.id === item.item.id && item.variant === addItem.variant
    );

    //discount cannot exceed price
    const quantity = parseFloat(oldItems[index].quantity as unknown as string);

    if (newDiscount >= oldItems[index].price * quantity) {
      newDiscount = oldItems[index].price * quantity;
    }

    if (index !== -1) {
      oldItems[index].discount = newDiscount;
    }

    setAppState((prev) => ({
      ...prev,
      added: oldItems,
    }));
  };

  const deleteItem = (index: number) => {
    const oldItems = [...added];

    oldItems.splice(index, 1);

    setAppState((prev) => ({
      ...prev,
      added: oldItems,
    }));
  };

  const copyLastItem = () => {
    if (added.length === 0) return;
    const last = added[added.length - 1];

    // Stock validation: sum all cart quantities for this product
    const available = getAvailableStock(last);
    if (available !== Infinity) {
      const totalInCart = added
        .filter(a => a.item.id === last.item.id && a.variant === last.variant)
        .reduce((sum, a) => sum + Number(a.quantity), 0);
      if (totalInCart + 1 > available) {
        notify({
          type: "error",
          title: t("Stock insufficient"),
          description: `${last.item.name}: ${t("available")} ${available}`,
          placement: "top",
          duration: 3,
        });
        return;
      }
    }

    const copy: CartItemModel = {
      ...last,
      quantity: 1,
      checked: false,
    };
    setAppState((prev) => ({
      ...prev,
      added: [...prev.added, copy],
    }));
  }

  const updateCartItemType = useCallback(
    (direction: "left" | "right") => {
      if (cartItemType === CartItemType.quantity) {
        if (direction === "right") {
          setAppState((prev) => ({
            ...prev,
            cartItemType: CartItemType.discount,
          }));
        } else {
          setAppState((prev) => ({
            ...prev,
            cartItemType: CartItemType.discount,
          }));
        }
      }
      if (cartItemType === CartItemType.discount) {
        if (direction === "right") {
          setAppState((prev) => ({
            ...prev,
            cartItemType: CartItemType.quantity,
          }));
        } else {
          setAppState((prev) => ({
            ...prev,
            cartItemType: CartItemType.quantity,
          }));
        }
      }
    },
    [cartItemType]
  );

  const updateCartItem = useCallback(
    (direction: "up" | "down") => {
      const addedItems = added.length;
      let newCartItem = cartItem;
      if (!newCartItem) {
        newCartItem = 0;
      }

      if (direction === "up") {
        if (cartItem !== 0) {
          setAppState((prev) => ({
            ...prev,
            cartItem: Number(newCartItem) - 1,
          }));
        } else if (cartItem === 0) {
          setAppState((prev) => ({
            ...prev,
            cartItem: addedItems - 1,
          }));
        }
      }
      if (direction === "down") {
        if (newCartItem + 1 < addedItems) {
          setAppState((prev) => ({
            ...prev,
            cartItem: Number(newCartItem) + 1,
          }));
        } else if (newCartItem + 1 >= addedItems) {
          setAppState((prev) => ({
            ...prev,
            cartItem: 0,
          }));
        }
      }
    },
    [cartItem, added]
  );

  Mousetrap.bind(
    ["ctrl+up", "ctrl+down", "ctrl+left", "ctrl+right", "del", 'ctrl+shift+down'],
    function (e: KeyboardEvent) {
      if (document.body.classList.contains("ReactModal__Body--open")) return;

      e.preventDefault();
      if (!cartItem) {
        setAppState((prev) => ({
          ...prev,
          cartItem: 0,
        }));
      }

      if (e.code === "Delete") {
        setAppState((prev) => ({
          ...prev,
          added: added.filter((item, index) => index !== cartItem),
        }));
      }

      //update quantity of last added item
      if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
        updateCartItemType(e.code === "ArrowLeft" ? "left" : "right");
      }

      // Ctrl+Shift+Down = copy last item
      if (e.code === "ArrowDown" && e.shiftKey) {
        copyLastItem();
      }
      // Ctrl+Down/Up = navigate cart items
      else if (e.code === "ArrowDown" || e.code === "ArrowUp") {
        updateCartItem(e.code === "ArrowDown" ? "down" : "up");
      }
    }
  );

  return (
    <div className="table w-full" style={{ touchAction: 'manipulation' }}>
      <div className="table-header-group sticky top-0 z-10 bg-gray-200">
        <div className="table-row">
          <div className="table-cell p-2 py-3 w-[30px]">
            <Checkbox
              indeterminate={indeterminate}
              checked={allChecked}
              onChange={onCheckAll}
              tabIndex={-1}
              className="align-middle"
            />
          </div>
          <div className="table-cell p-2 py-3 text-start text-sm font-bold">{t("Item")}</div>
          <div className="table-cell p-2 py-3 text-center text-sm font-bold w-[100px]">
            {t("Stock")}
          </div>
          <div className="table-cell p-2 py-3 text-center text-sm font-bold w-[100px]">
            {t("QTY")}
          </div>
          <div className="table-cell p-2 py-3 text-center text-sm font-bold w-[100px]">
            {t("Disc.")}
          </div>
          <div className="table-cell p-2 py-3 text-center text-sm font-bold w-[100px]">
            {t("Taxes")}
          </div>
          <div className="table-cell p-2 py-3 text-center text-sm font-bold w-[100px]">
            {t("Rate")}
          </div>
          <div className="table-cell p-2 py-3 text-end text-sm font-bold w-[100px]">
            {t("Total")}
          </div>
          {/*<div className="table-cell w-[80px]"/>*/}
        </div>
      </div>
      <div className="table-row-group">
        {added.map((item, index) => (
          <CartItem
            key={index}
            onQuantityChange={onQuantityChange}
            onDiscountChange={onDiscountChange}
            onPriceChange={onPriceChange}
            deleteItem={deleteItem}
            item={item}
            index={index}
            onCheck={onCheck}
          />
        ))}
      </div>
      <div className="table-footer-group">
        <div className="table-row font-bold">
          <div className="table-cell p-2">{added.length}</div>
          <div className="table-cell">{t("items")}</div>
          <div className="table-cell"></div>
          <div className="table-cell text-center p-2">
            {added.reduce((previous, item) => {
              return parseFloat(item.quantity as unknown as string) + previous;
            }, 0)}
          </div>
          <div className="table-cell"></div>
          <div className="table-cell"></div>
          <div className="table-cell"></div>
          <div className="table-cell text-end p-2">
            {withCurrency(subTotal(added))}
          </div>
        </div>
      </div>
    </div>
  );
};
