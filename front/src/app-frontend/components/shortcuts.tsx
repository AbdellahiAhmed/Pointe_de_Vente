import { Button } from "../../app-common/components/input/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQuestionCircle } from "@fortawesome/free-solid-svg-icons";
import { Tooltip } from "antd";
import { Modal } from "../../app-common/components/modal/modal";
import React, { useMemo, useState } from "react";
import { Shortcut } from "../../app-common/components/input/shortcut";
import { Switch } from "../../app-common/components/input/switch";
import { useAtom } from "jotai";
import { defaultData } from "../../store/jotai";
import { useTranslation } from "react-i18next";
import { SHORTCUT_ACTIONS, SHORTCUT_CATEGORIES } from "../../core/shortcuts/shortcut.registry";
import { useShortcutKey } from "../../core/shortcuts/use-shortcut-key";

const ShortcutRow = ({ actionId, labelKey }: { actionId: string; labelKey: string }) => {
  const { t } = useTranslation();
  const key = useShortcutKey(actionId);
  const parts = key.split('+');

  return (
    <div className="grid grid-cols-2 hover:bg-gray-100 p-3">
      <div>{t(labelKey)}</div>
      <div>
        {parts.map((part, i) => (
          <span className="shortcut-btn" key={i}>{part}</span>
        ))}
      </div>
    </div>
  );
};

export const Shortcuts = () => {
  const {t} = useTranslation();
  const [defaultOptions, setDefaultOptions] = useAtom(defaultData);
  const {
    displayShortcuts,
    enableShortcuts,
  } = defaultOptions;

  const [modal, setModal] = useState(false);
  const [q, setQ] = useState('');

  const filteredActions = useMemo(() => {
    return Object.values(SHORTCUT_ACTIONS).filter(action =>
      t(action.labelKey).toLowerCase().indexOf(q.toLowerCase()) !== -1
    );
  }, [q, t]);

  const categories = useMemo(() => {
    const cats: string[] = [];
    filteredActions.forEach(a => {
      if (!cats.includes(a.category)) cats.push(a.category);
    });
    return cats;
  }, [filteredActions]);

  return (
    <>
      <Tooltip title={t("Help")}>
        <Button variant="secondary" size="lg" iconButton onClick={() => setModal(true)} tabIndex={-1}>
          <FontAwesomeIcon icon={faQuestionCircle} size="lg" />
          <Shortcut actionId="open_help" handler={() => setModal(true)} />
        </Button>
      </Tooltip>

      <Modal
        title={t("Help")}
        open={modal}
        onClose={() => {
          setModal(!modal)
        }}
      >
        <div className="flex gap-3 mb-3">
          <Switch
            checked={enableShortcuts}
            onChange={(value) => {
              setDefaultOptions((prev) => ({
                ...prev,
                enableShortcuts: value.target.checked,
              }));
            }}>
            {t("Enable shortcuts?")}
          </Switch>

          {enableShortcuts && (
            <Switch
              checked={displayShortcuts}
              onChange={(value) => {
                setDefaultOptions((prev) => ({
                  ...prev,
                  displayShortcuts: value.target.checked,
                }));
              }}>
              {t("Display shortcut texts?")}
            </Switch>
          )}
        </div>

        <input
          type="search"
          className="form-control search-field w-full mb-3"
          autoFocus={true}
          onChange={(event) => setQ(event.target.value)}
        />
        {categories.map((cat) => (
          <div key={cat}>
            <div className="px-3 py-2 text-xs font-bold uppercase text-gray-500 bg-gray-50 border-b">
              {t(SHORTCUT_CATEGORIES[cat] || cat)}
            </div>
            {filteredActions
              .filter(a => a.category === cat)
              .map((action) => (
                <ShortcutRow key={action.id} actionId={action.id} labelKey={action.labelKey} />
              ))}
          </div>
        ))}
    </Modal>
    </>
  );
}
