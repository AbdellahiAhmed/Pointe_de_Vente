import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import FrLang from './language/lang.fr.json';
import ArLang from './language/lang.ar.json';

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      fr: {
        translation: FrLang
      },
      ar: {
        translation: ArLang
      }
    },
    lng: localStorage.getItem('locale') ?? "fr",
    fallbackLng: "fr",
    interpolation: {
      escapeValue: false // react already safes from xss => https://www.i18next.com/translation-function/interpolation#unescape
    },
    saveMissing: true,
    saveMissingTo: "current",
    keySeparator: false
  });

export default i18n;
