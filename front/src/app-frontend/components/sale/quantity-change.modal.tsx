import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CartItem } from "../../../api/model/cart.item";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMinus, faPlus } from "@fortawesome/free-solid-svg-icons";

interface QuantityChangeModalProps {
  open: boolean;
  cartItem: CartItem | null;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

export const QuantityChangeModal = ({
  open,
  cartItem,
  onClose,
  onConfirm,
}: QuantityChangeModalProps) => {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && cartItem) {
      setQuantity(cartItem.quantity);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [open, cartItem]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity > 0) {
      onConfirm(quantity);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open || !cartItem) return null;

  const productName = cartItem.variant
    ? `${cartItem.item.name} (${cartItem.variant.attributeValue})`
    : cartItem.item.name;

  return (
    <div className="pos-modal-overlay" onKeyDown={handleKeyDown}>
      <div className="pos-modal">
        <div className="pos-modal__header">
          <h3>{t("Change Quantity")}</h3>
          <button type="button" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="pos-modal__body">
            <div style={{ marginBottom: 12, fontWeight: 500, fontSize: 15 }}>
              {productName}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: 44, height: 44, fontSize: 18 }}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <FontAwesomeIcon icon={faMinus} />
              </button>
              <input
                ref={inputRef}
                type="number"
                className="pos-modal__input"
                value={quantity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val > 0) setQuantity(val);
                }}
                min={1}
                step={1}
                autoFocus
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: 44, height: 44, fontSize: 18 }}
                onClick={() => setQuantity((q) => q + 1)}
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
            </div>
          </div>
          <div className="pos-modal__footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t("Cancel")}
            </button>
            <button type="submit" className="btn btn-primary">
              {t("Confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
