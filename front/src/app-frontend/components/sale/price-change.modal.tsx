import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CartItem } from "../../../api/model/cart.item";
import { withCurrency } from "../../../lib/currency/currency";

interface PriceChangeModalProps {
  open: boolean;
  cartItem: CartItem | null;
  onClose: () => void;
  onConfirm: (price: number) => void;
}

export const PriceChangeModal = ({
  open,
  cartItem,
  onClose,
  onConfirm,
}: PriceChangeModalProps) => {
  const { t } = useTranslation();
  const [price, setPrice] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const product = cartItem?.item;
  const minPrice = product?.minPrice;
  const maxPrice = product?.basePrice;
  const isFixedPrice = minPrice === undefined || minPrice === null;

  useEffect(() => {
    if (open && cartItem) {
      setPrice(cartItem.price);
      setError(null);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [open, cartItem]);

  const validate = (val: number): string | null => {
    if (isFixedPrice) {
      return t("This product has a fixed price");
    }
    if (val < Number(minPrice)) {
      return `${t("Minimum price")}: ${withCurrency(Number(minPrice))}`;
    }
    if (maxPrice && val > Number(maxPrice)) {
      return `${t("Maximum price")}: ${withCurrency(Number(maxPrice))}`;
    }
    return null;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      setPrice(val);
      setError(validate(val));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFixedPrice) return;
    const validationError = validate(price);
    if (validationError && !isFixedPrice) {
      setError(validationError);
      return;
    }
    onConfirm(price);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  if (!open || !cartItem || !product) return null;

  const productName = cartItem.variant
    ? `${product.name} (${cartItem.variant.attributeValue})`
    : product.name;

  return (
    <div className="pos-modal-overlay" onKeyDown={handleKeyDown}>
      <div className="pos-modal">
        <div className="pos-modal__header">
          <h3>{t("Change Price")}</h3>
          <button type="button" onClick={onClose}>&times;</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="pos-modal__body">
            <div style={{ marginBottom: 12, fontWeight: 500, fontSize: 15 }}>
              {productName}
            </div>

            {!isFixedPrice && (
              <div className="pos-modal__range">
                {t("Price range")}: {withCurrency(Number(minPrice))} &ndash; {withCurrency(Number(maxPrice))}
              </div>
            )}

            {isFixedPrice && (
              <div className="pos-modal__range" style={{ color: "var(--pos-warning, #d97706)" }}>
                {t("Fixed price")}: {withCurrency(Number(maxPrice))}
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, display: "block" }}>
                {t("New price")}
              </label>
              <input
                ref={inputRef}
                type="number"
                className="pos-modal__input"
                value={price}
                onChange={handlePriceChange}
                min={isFixedPrice ? maxPrice : minPrice}
                max={maxPrice}
                step={0.01}
                disabled={isFixedPrice}
                autoFocus
              />
            </div>

            {error && (
              <div className="pos-modal__error">{error}</div>
            )}
          </div>
          <div className="pos-modal__footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t("Cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isFixedPrice || !!error}
            >
              {t("Confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
