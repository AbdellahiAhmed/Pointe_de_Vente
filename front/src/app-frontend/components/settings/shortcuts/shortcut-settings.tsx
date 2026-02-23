import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAtom } from "jotai";
import { defaultData } from "../../../../store/jotai";
import {
  SHORTCUT_ACTIONS,
  SHORTCUT_CATEGORIES,
  getActionsByCategory,
  ShortcutAction,
} from "../../../../core/shortcuts/shortcut.registry";
import { useShortcutKey } from "../../../../core/shortcuts/use-shortcut-key";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faKeyboard,
  faUndo,
  faCircle,
  faCheck,
  faTimes,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import { Switch } from "../../../../app-common/components/input/switch";
import { Button } from "../../../../app-common/components/input/button";
import { notify } from "../../../../app-common/components/confirm/notification";

// ── Key Recorder ──

function keyEventToMousetrap(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push("ctrl");
  if (e.shiftKey) parts.push("shift");
  if (e.altKey) parts.push("alt");

  const key = e.key.toLowerCase();
  // Map special keys to Mousetrap format
  const keyMap: Record<string, string> = {
    control: "",
    shift: "",
    alt: "",
    meta: "",
    enter: "enter",
    escape: "escape",
    backspace: "backspace",
    tab: "tab",
    delete: "del",
    arrowup: "up",
    arrowdown: "down",
    arrowleft: "left",
    arrowright: "right",
    " ": "space",
  };

  const mappedKey = keyMap[key] ?? key;
  if (mappedKey) parts.push(mappedKey);

  return parts.join("+");
}

// ── Shortcut Row ──

interface ShortcutRowProps {
  action: ShortcutAction;
  currentKey: string;
  onRecord: (actionId: string, newKey: string) => void;
  conflict?: string; // action label that conflicts
}

const ShortcutRow: FC<ShortcutRowProps> = ({ action, currentKey, onRecord, conflict }) => {
  const { t } = useTranslation();
  const [recording, setRecording] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  const isModified = currentKey !== action.defaultKey;
  const keyParts = (pendingKey ?? currentKey).split("+");

  useEffect(() => {
    if (!recording) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Ignore bare modifier presses
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

      const combo = keyEventToMousetrap(e);
      if (combo) {
        setPendingKey(combo);
        onRecord(action.id, combo);
        setRecording(false);
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [recording, action.id, onRecord]);

  // Click outside to cancel recording
  useEffect(() => {
    if (!recording) return;
    const handler = (e: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        setRecording(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [recording]);

  return (
    <div
      ref={rowRef}
      className={`shortcut-row ${recording ? "shortcut-row--recording" : ""} ${isModified ? "shortcut-row--modified" : ""}`}
    >
      <div className="shortcut-row__label">
        <span>{t(action.labelKey)}</span>
        {isModified && (
          <span className="shortcut-row__modified-badge">{t("Modified")}</span>
        )}
        {conflict && (
          <span className="shortcut-row__conflict">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            {t("Conflict with")} {conflict}
          </span>
        )}
      </div>
      <div className="shortcut-row__key">
        {recording ? (
          <span className="shortcut-key-badge shortcut-key-badge--recording">
            <FontAwesomeIcon icon={faCircle} className="shortcut-key-badge__pulse" />
            {t("Press a key...")}
          </span>
        ) : (
          <div className="shortcut-key-badges">
            {keyParts.map((part, i) => (
              <span className="shortcut-key-badge" key={i}>{part}</span>
            ))}
          </div>
        )}
      </div>
      <div className="shortcut-row__actions">
        {!recording ? (
          <button
            className="shortcut-row__record-btn"
            onClick={() => {
              setRecording(true);
              setPendingKey(null);
            }}
            type="button"
          >
            <FontAwesomeIcon icon={faKeyboard} />
            <span>{t("Record")}</span>
          </button>
        ) : (
          <button
            className="shortcut-row__cancel-btn"
            onClick={() => setRecording(false)}
            type="button"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        )}
        {isModified && !recording && (
          <button
            className="shortcut-row__reset-btn"
            onClick={() => onRecord(action.id, action.defaultKey)}
            type="button"
            title={t("Reset to default")}
          >
            <FontAwesomeIcon icon={faUndo} />
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main Settings Component ──

export const ShortcutSettings: FC = () => {
  const { t } = useTranslation();
  const [defaultOptions, setDefaultOptions] = useAtom(defaultData);
  const { enableShortcuts, displayShortcuts, customShortcuts } = defaultOptions;

  const getConflict = useCallback(
    (actionId: string, key: string): string | undefined => {
      const allActions = Object.values(SHORTCUT_ACTIONS);
      for (const a of allActions) {
        if (a.id === actionId) continue;
        const aKey = customShortcuts?.[a.id] ?? a.defaultKey;
        if (aKey === key) return t(a.labelKey);
      }
      return undefined;
    },
    [customShortcuts, t]
  );

  const handleRecord = useCallback(
    (actionId: string, newKey: string) => {
      setDefaultOptions((prev) => ({
        ...prev,
        customShortcuts: {
          ...prev.customShortcuts,
          [actionId]: newKey,
        },
      }));
    },
    [setDefaultOptions]
  );

  const resetAll = useCallback(() => {
    setDefaultOptions((prev) => ({
      ...prev,
      customShortcuts: undefined,
    }));
    notify({ type: "success", description: t("All shortcuts reset to defaults") });
  }, [setDefaultOptions, t]);

  const hasCustom = customShortcuts && Object.keys(customShortcuts).length > 0;
  const categories = ["pos", "cart", "sale", "panels"];

  return (
    <div className="settings-content">
      <h2 className="settings-content-title">{t("Keyboard Shortcuts")}</h2>
      <p className="settings-content-subtitle">
        {t("Customize keyboard shortcuts for faster workflow")}
      </p>

      {/* Enable/Display toggles */}
      <div className="settings-card">
        <div className="settings-card__header">
          <FontAwesomeIcon icon={faKeyboard} style={{ marginInlineEnd: 8, color: "var(--pos-primary)" }} />
          <h3 className="settings-card__title">{t("Shortcut Options")}</h3>
        </div>
        <div className="settings-card__body">
          <div className="settings-card__row">
            <div>
              <div className="settings-card__row-label">{t("Enable keyboard shortcuts")}</div>
              <div className="settings-card__row-description">
                {t("Turn off to disable all keyboard shortcuts")}
              </div>
            </div>
            <div className="settings-card__row-control">
              <Switch
                checked={enableShortcuts}
                onChange={(value) => {
                  setDefaultOptions((prev) => ({
                    ...prev,
                    enableShortcuts: value.target.checked,
                  }));
                }}
              />
            </div>
          </div>
          {enableShortcuts && (
            <div className="settings-card__row">
              <div>
                <div className="settings-card__row-label">{t("Show shortcut hints")}</div>
                <div className="settings-card__row-description">
                  {t("Display shortcut key badges on buttons")}
                </div>
              </div>
              <div className="settings-card__row-control">
                <Switch
                  checked={displayShortcuts}
                  onChange={(value) => {
                    setDefaultOptions((prev) => ({
                      ...prev,
                      displayShortcuts: value.target.checked,
                    }));
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Shortcut mappings */}
      {enableShortcuts && (
        <>
          {hasCustom && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <Button variant="danger" size="sm" onClick={resetAll}>
                <FontAwesomeIcon icon={faUndo} className="me-1" />
                {t("Reset all to defaults")}
              </Button>
            </div>
          )}

          {categories.map((cat) => {
            const actions = getActionsByCategory(cat);
            if (actions.length === 0) return null;

            return (
              <div className="settings-card" key={cat}>
                <div className="settings-card__header">
                  <h3 className="settings-card__title">
                    {t(SHORTCUT_CATEGORIES[cat] || cat)}
                  </h3>
                </div>
                <div className="settings-card__body" style={{ padding: 0 }}>
                  {actions.map((action) => {
                    const currentKey = customShortcuts?.[action.id] ?? action.defaultKey;
                    const conflict = getConflict(action.id, currentKey);

                    return (
                      <ShortcutRow
                        key={action.id}
                        action={action}
                        currentKey={currentKey}
                        onRecord={handleRecord}
                        conflict={conflict}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
