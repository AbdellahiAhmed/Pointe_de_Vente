import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../app-common/components/input/button";
import { Modal } from "../../../app-common/components/modal/modal";
import { useAtom } from "jotai";
import { defaultData, defaultState, PosModes } from "../../../store/jotai";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck, faGlobe } from "@fortawesome/free-solid-svg-icons";
import classNames from "classnames";
import { faPenToSquare } from "@fortawesome/free-regular-svg-icons";
import i18next from "../../../i18next";

export const TopbarRight = () => {
  const { t } = useTranslation();
  const [defaultAppState, setDefaultAppState] = useAtom(defaultData);
  const { defaultMode } = defaultAppState;

  const [appState, setAppState] = useAtom(defaultState);

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
    localStorage.setItem('locale', newLocale);
    i18next.changeLanguage(newLocale);

    const bootstrapCss = document.querySelector('#bootstrap-css');
    if (newLocale === 'ar') {
      document.dir = 'rtl';
      if (bootstrapCss) {
        bootstrapCss.setAttribute('href', 'https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.rtl.min.css');
      }
    } else {
      document.dir = 'ltr';
      if (bootstrapCss) {
        bootstrapCss.setAttribute('href', 'https://cdn.jsdelivr.net/npm/bootstrap@5.2.0/dist/css/bootstrap.min.css');
      }
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button size="lg" variant="secondary" onClick={toggleLocale} title={locale === 'fr' ? 'العربية' : 'Français'}>
          <FontAwesomeIcon icon={faGlobe} className="mr-2"/>
          {locale === 'fr' ? 'AR' : 'FR'}
        </Button>
        <Button size="lg" variant="primary" onClick={() => setModal(true)}>
          <FontAwesomeIcon icon={faPenToSquare} className="mr-3"/>
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
                <FontAwesomeIcon icon={faCheck} className="mr-3"/>
              )}
              {item.label}
            </Button>
          ))}
        </div>
      </Modal>
    </>
  );
};
