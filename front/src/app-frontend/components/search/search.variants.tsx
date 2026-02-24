import React, { useState } from "react";
import classNames from "classnames";
import { getRealProductPrice } from "../../containers/dashboard/pos";
import { Modal } from "../../../app-common/components/modal/modal";
import { Product } from "../../../api/model/product";
import { ProductVariant } from "../../../api/model/product.variant";
import { useAtom } from "jotai";
import { defaultState } from "../../../store/jotai";
import Mousetrap from "mousetrap";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBox,
  faBoxOpen,
  faBarcode,
  faTag,
  faCheckCircle,
  faLayerGroup,
} from "@fortawesome/free-solid-svg-icons";
import { withCurrency } from "../../../lib/currency/currency";

interface Props {
  modal: boolean;
  onClose: () => void;
  variants: ProductVariant[];
  addItemVariant: (item: Product, variant: ProductVariant, quantity: number, price?: number) => void;
  addItemBase?: (item: Product, quantity: number) => void;
  items: Product[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const getMediaUrl = (product: Product): string | null => {
  if (!product.media) return null;
  return `/api/media/${product.media.id}/content`;
};

// ─── Variant Card ────────────────────────────────────────────────────────────

interface VariantCardProps {
  label: string;
  sublabel?: string;
  barcode?: string;
  price: number;
  isBase?: boolean;
  isSelected: boolean;
  onClick: () => void;
}

const VariantCard = ({ label, sublabel, barcode, price, isBase, isSelected, onClick }: VariantCardProps) => {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        minHeight: "72px",
        padding: "14px 16px",
        marginBottom: "8px",
        border: isSelected
          ? "2px solid #0046FE"
          : "2px solid #e5e7eb",
        borderRadius: "12px",
        background: isSelected
          ? "#CBDFFE"
          : "#ffffff",
        cursor: "pointer",
        textAlign: "start",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        transition: "border-color 0.12s ease, background 0.12s ease, box-shadow 0.12s ease",
        boxShadow: isSelected
          ? "0 0 0 3px rgba(0,70,254,0.15)"
          : "0 1px 2px rgba(0,0,0,0.05)",
        position: "relative",
        gap: "14px",
      }}
    >
      {/* Icon badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "44px",
          height: "44px",
          borderRadius: "10px",
          flexShrink: 0,
          background: isSelected
            ? "#0046FE"
            : "#f1f5f9",
          color: isSelected ? "#fff" : isBase ? "#001C93" : "#6b7280",
          fontSize: "18px",
          transition: "background 0.12s ease, color 0.12s ease",
        }}
      >
        <FontAwesomeIcon icon={isBase ? faBoxOpen : faBox} />
      </div>

      {/* Text block */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            marginBottom: "2px",
          }}
        >
          <span
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: isSelected ? "#001C93" : "#1a1a1a",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
              lineHeight: 1.3,
            }}
          >
            {label}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {isBase && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#001C93",
                background: "#CBDFFE",
                borderRadius: "100px",
                padding: "2px 8px",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}
            >
              <FontAwesomeIcon icon={faLayerGroup} style={{ fontSize: "9px" }} />
              {t("Base product")}
            </span>
          )}
          {sublabel && !isBase && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: 600,
                color: "#6b7280",
              }}
            >
              <FontAwesomeIcon icon={faTag} style={{ fontSize: "10px" }} />
              {sublabel}
            </span>
          )}
          {barcode && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: 500,
                color: "#9ca3af",
                fontFamily: "monospace",
              }}
            >
              <FontAwesomeIcon icon={faBarcode} style={{ fontSize: "10px" }} />
              {barcode}
            </span>
          )}
        </div>
      </div>

      {/* Price block */}
      <div
        style={{
          flexShrink: 0,
          textAlign: "end",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "2px",
        }}
      >
        <span
          style={{
            fontSize: "18px",
            fontWeight: 800,
            color: isSelected ? "#001C93" : "#1a1a1a",
            letterSpacing: "-0.02em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {withCurrency(price)}
        </span>
      </div>

      {/* Selected checkmark indicator */}
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            insetInlineEnd: "10px",
            fontSize: "16px",
            color: "#0046FE",
            lineHeight: 1,
          }}
        >
          <FontAwesomeIcon icon={faCheckCircle} />
        </div>
      )}
    </button>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

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
    if (event.key === "ArrowDown") {
      let newSelected = selectedVariant + 1;
      if (newSelected >= totalOptions) {
        newSelected = 0;
      }
      setAppState((prev) => ({
        ...prev,
        selectedVariant: newSelected,
      }));
    } else if (event.key === "ArrowUp") {
      let newSelected = selectedVariant - 1;
      if (newSelected < 0) {
        newSelected = totalOptions - 1;
      }
      setAppState((prev) => ({
        ...prev,
        selectedVariant: newSelected,
      }));
    } else if (event.key === "Enter") {
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
    if (modal) {
      moveVariantsCursor(e);
    }
  });

  // ── Image state ──
  const [imgOk, setImgOk] = useState(false);
  const [imgErr, setImgErr] = useState(false);
  const mediaUrl = latest ? getMediaUrl(latest) : null;
  const showImg = mediaUrl && !imgErr;

  return (
    <Modal
      open={modal}
      onClose={onClose}
      title={
        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FontAwesomeIcon
            icon={faLayerGroup}
            style={{ color: "#0046FE", fontSize: "18px" }}
          />
          <span style={{ fontSize: "16px", fontWeight: 800, color: "#1a1a1a" }}>
            {t("Choose a variant for")}{" "}
            <span style={{ color: "#001C93" }}>{latest?.name}</span>
          </span>
        </span>
      }
      hideCloseButton={false}
      shouldCloseOnOverlayClick={false}
    >
      {/* ── Product hero header ── */}
      {latest && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "14px 0 18px",
            borderBottom: "1px solid #e5e7eb",
            marginBottom: "16px",
          }}
        >
          {/* Thumbnail */}
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
              overflow: "hidden",
              flexShrink: 0,
              border: "1.5px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            {!showImg && (
              <FontAwesomeIcon
                icon={faBoxOpen}
                style={{ fontSize: "22px", color: "#9ca3af" }}
              />
            )}
            {showImg && (
              <img
                src={mediaUrl}
                alt={latest.name}
                loading="lazy"
                onLoad={() => setImgOk(true)}
                onError={() => setImgErr(true)}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: imgOk ? 1 : 0,
                  transition: "opacity 0.25s ease",
                }}
              />
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "17px",
                fontWeight: 800,
                color: "#1a1a1a",
                marginBottom: "4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {latest.name}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "12px",
                  fontWeight: 700,
                  color: "#6b7280",
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "100px",
                  padding: "2px 10px",
                }}
              >
                <FontAwesomeIcon icon={faLayerGroup} style={{ fontSize: "10px", color: "#0046FE" }} />
                {totalOptions} {t("options")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Hint for keyboard users ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "12px",
          fontSize: "11px",
          fontWeight: 500,
          color: "#9ca3af",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            padding: "1px 6px",
            fontSize: "10px",
            fontWeight: 700,
            fontFamily: "monospace",
            color: "#6b7280",
          }}
        >
          {"\u2191"} {"\u2193"}
        </span>
        {t("Navigate")}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "4px",
            padding: "1px 6px",
            fontSize: "10px",
            fontWeight: 700,
            fontFamily: "monospace",
            color: "#6b7280",
          }}
        >
          Enter
        </span>
        {t("Select")}
      </div>

      {/* ── Option cards ── */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* Base product option */}
        {latest && (
          <VariantCard
            label={latest.name}
            isBase={true}
            isSelected={selectedVariant === 0}
            price={getRealProductPrice(latest)}
            onClick={() => {
              if (addItemBase) {
                addItemBase(latest, quantity);
              }
            }}
          />
        )}

        {/* Variant options */}
        {variants.map((item, index) => (
          <VariantCard
            key={index}
            label={item.name ?? item.attributeValue ?? `${t("Variant")} ${index + 1}`}
            sublabel={item.attributeName}
            barcode={item.barcode}
            isBase={false}
            isSelected={selectedVariant === index + 1}
            price={item.price === null || item.price === undefined
              ? getRealProductPrice(latest!)
              : item.price
            }
            onClick={() => addItemVariant(latest!, item, quantity)}
          />
        ))}
      </div>
    </Modal>
  );
};
