import React from "react";
import {useTranslation} from "react-i18next";

export const Footer = () => {
  const {t} = useTranslation();
  return (
    <div className="bg-footer mt-5">
      <div className="p-5">
        <div className="row">
          <div className="col-12 col-md-3">
            <div className="footer-links">
              <h3>{t("Do you have questions?")}</h3>
              <h3> {t("Call or visit us.")}</h3>
              <div className="ft-phone">
                <a href="tel:+22200000000">+222 00 00 00 00</a>
              </div>
              <p className="pt-2">
                Nouakchott, Mauritanie
              </p>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="footer-links">
              <h3>{t("Useful Links")}</h3>
              <ul className="list-unstyled">
                <li>
                  {t("About Us")}
                </li>
                <li>
                  {t("Pricing")}
                </li>
                <li>
                  {t("Privacy Policy")}
                </li>
                <li>
                  {t("Terms & Conditions")}
                </li>
                <li>
                  {t("Cookies Policy")}
                </li>
              </ul>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="footer-links">
              <ul className="list-unstyled">
                <li>
                  {t("Disclaimer")}
                </li>
                <li>
                  {t("Contact")}
                </li>
              </ul>
            </div>
          </div>
          <div className="col-12 col-md-3">
            <h3>{t("Connect With Us")}</h3>
            <p>{t("Join us on Our Social Platforms for latest news & Updates")}</p>
            <ul className="social-network social-circle list-unstyled text-white list-inline">
              <li>Facebook</li>
              <li>Twitter</li>
              <li>Instagram</li>
              <li>LinkedIn</li>
            </ul>
          </div>
          <div className="col-12 my-5">
            <div className="footer-bottom text-center">
              {t("Copyright")} {new Date().getFullYear()} — {import.meta.env.VITE_WEBSITE_NAME || 'POS'} — {t("All Rights Reserved")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};