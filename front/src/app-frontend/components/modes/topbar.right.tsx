import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../app-common/components/input/button";
import { Modal } from "../../../app-common/components/modal/modal";
import { useAtom, useSetAtom } from "jotai";
import { defaultData, defaultState, PosModes, appModeAtom } from "../../../store/jotai";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faGlobe } from "@fortawesome/free-solid-svg-icons";
import classNames from "classnames";
import { faPenToSquare } from "@fortawesome/free-regular-svg-icons";
import { applyLocale } from "../../../lib/rtl";
import { useHasRole } from "../../../duck/auth/hooks/useHasRole";
import { useOnlineStatus } from "../../../core/hooks/useOnlineStatus";
import { Tooltip } from "antd";

export const TopbarRight = () => {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const [defaultAppState, setDefaultAppState] = useAtom(defaultData);
  const { defaultMode } = defaultAppState;

  const [appState, setAppState] = useAtom(defaultState);
  const setAppMode = useSetAtom(appModeAtom);
  const isManager = useHasRole('ROLE_MANAGER');

  const [modal, setModal] = useState(false);
  const [locale, setLocale] = useState(localStorage.getItem('locale') ?? 'fr');

  const options = [
    { label: t("Pos"), value: PosModes.pos },
    { label: t("Order only"), value: PosModes.order },
    { label: t("Payment only"), value: PosModes.payment },
  ];

  const toggleLocale = () => {
    const newLocale = locale === 'fr' ? 'ar' : 'fr';
    setLocale(newLocale);
    applyLocale(newLocale);
  };

  return (
    <>
      <div className="flex gap-2 items-center">
        {/* Online / Offline indicator */}
        <Tooltip title={isOnline ? t("Online") : t("Offline")}>
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: isOnline ? '#16a34a' : '#dc2626',
              boxShadow: isOnline
                ? '0 0 6px rgba(22,163,74,0.6)'
                : '0 0 6px rgba(220,38,38,0.6)',
              marginInlineEnd: 4,
            }}
          />
        </Tooltip>

        {isManager && (
          <Button
            size="lg"
            variant="secondary"
            onClick={() => {
              window.history.replaceState(null, '', '/dashboard');
              setAppMode('admin');
            }}
            title={t("Administration")}
            style={{backgroundColor: '#0d6efd', color: '#fff', borderColor: '#0d6efd'}}
          >
            <i className="bi bi-speedometer2 me-2"></i>
            {t("Administration")}
          </Button>
        )}
        <Button size="lg" variant="secondary" onClick={toggleLocale} title={locale === 'fr' ? 'العربية' : 'Français'}>
          <FontAwesomeIcon icon={faGlobe} className="me-2"/>
          {locale === 'fr' ? 'AR' : 'FR'}
        </Button>
        <Button size="lg" variant="primary" onClick={() => setModal(true)}>
          <FontAwesomeIcon icon={faPenToSquare} className="me-3"/>
          {defaultMode} {t("mode")}
        </Button>
      </div>

      <Modal
        title={t("Select a mode")}
        shouldCloseOnEsc
        size="sm"
        open={modal}
        onClose={() => setModal(false)}>
        <div className="list-group">
          {options.map((item) => (
            <Button
              key={item.label}
              variant={item.value === defaultMode ? "primary" : "secondary"}
              className={classNames("w-full")}
              onClick={() => {
                setDefaultAppState((prev) => ({
                  ...prev,
                  defaultMode: item.value,
                }));

                setAppState(prev => ({
                  ...prev,
                  added: []
                }));

                setModal(false);
              }}
              size="lg">
              {item.value === defaultMode && (
                <FontAwesomeIcon icon={faCheck} className="me-3"/>
              )}
              {item.label}
            </Button>
          ))}
        </div>
      </Modal>
    </>
  );
};
