import React, {useEffect, useState} from 'react';
import {useSelector} from "react-redux";
import {getAuthorizedUser, isUserLoggedIn} from "../../../duck/auth/auth.selector";
import {useLogout} from "../../../duck/auth/hooks/useLogout";
import {useNavigate} from "react-router";
import {LOGIN, PROFILE} from "../../routes/frontend.routes";
import {useTranslation} from "react-i18next";
import {Link} from "react-router-dom";
import { applyLocale } from "../../../lib/rtl";
import classNames from "classnames";
import {jsonRequest} from "../../../api/request/request";
import {UPDATE_LOCALE} from "../../../api/routing/routes/backend.app";
import {useSetAtom} from "jotai";
import {appModeAtom} from "../../../store/jotai";


const Navigation = () => {
  const {t} = useTranslation();
  const isLoggedIn = useSelector(isUserLoggedIn);
  const user = useSelector(getAuthorizedUser);

  const [logoutState, logoutAction] = useLogout();
  const navigate = useNavigate();

  const setAppMode = useSetAtom(appModeAtom);
  const [locale, setLocale] = useState(localStorage.getItem('locale') ?? 'fr');

  const updateLocale = async (lang: string) => {
    setLocale(lang);
    await applyLocale(lang);
    // save on server in background (don't block UI)
    jsonRequest(UPDATE_LOCALE, {
      method: 'POST',
      body: JSON.stringify({ locale: lang })
    }).catch(() => {});
  };


  const logout = () => {
    logoutAction();
    navigate(LOGIN);
  }

  const toggleSidebar = () => {
    const body = document.body;
    body.classList.toggle('toggle-sidebar');
  };

  //set application locale based on localStorage
  useEffect(() => {
    const lang = localStorage.getItem('locale');
    if(lang !== null){
      updateLocale(lang);
    }
  }, []);

  if (!isLoggedIn) {
    return (<></>);
  }

  return (
    <header id="header" className="header fixed-top d-flex align-items-center">
      <div className="d-flex align-items-center justify-content-between">
        <a href="/" className="logo d-flex align-items-center">
          <i className="bi bi-shop fs-4 me-2"></i>
          <span className="d-none d-lg-block">{import.meta.env.VITE_WEBSITE_NAME}</span>
        </a>
        <i className="bi bi-list toggle-sidebar-btn" onClick={toggleSidebar}></i>
      </div>
      <nav className="header-nav ms-auto">
        <ul className="d-flex align-items-center">
          <li className="nav-item pe-3">
            <button
              className="btn btn-success btn-sm d-flex align-items-center gap-2"
              onClick={() => {
                window.history.replaceState(null, '', '/pos');
                setAppMode('pos');
              }}
              title={t('Open POS')}
            >
              <i className="bi bi-cash-register"></i>
              <span className="d-none d-md-inline">{t('Open POS')}</span>
            </button>
          </li>
          <li className="nav-item dropdown pe-3">
            <a className="nav-link d-flex align-items-center pe-0" href="#" data-bs-toggle="dropdown">
              <span className="dropdown-toggle ps-2">{locale}</span>
            </a>
            <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow">
              <li>
                <a href="#" className={classNames(
                  'dropdown-item d-flex align-items-center',
                  locale === 'fr' ? 'active' : ''
                )} onClick={(e) => { e.preventDefault(); updateLocale('fr'); }}>
                  <span>FR - Français</span>
                </a>
              </li>
              <li>
                <a href="#" className={
                  classNames(
                    'dropdown-item d-flex align-items-center',
                    locale === 'ar' ? 'active' : ''
                  )
                } onClick={(e) => { e.preventDefault(); updateLocale('ar'); }}>
                  <span>AR - العربية</span>
                </a>
              </li>
            </ul>
          </li>
          <li className="nav-item dropdown pe-3">
            <a className="nav-link nav-profile d-flex align-items-center pe-0" href="#" data-bs-toggle="dropdown">
              <span className="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center" style={{width: 32, height: 32, fontSize: 14, fontWeight: 600}}>{user?.displayName?.charAt(0)?.toUpperCase() || 'U'}</span>
              <span className="d-none d-md-block dropdown-toggle ps-2">{user?.displayName}</span>
            </a>

            <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow profile">
              <li className="dropdown-header">
                <h6>{user?.displayName}</h6>
              </li>
              <li>
                <hr className="dropdown-divider"/>
              </li>
              <li>
                <Link to={PROFILE} className="dropdown-item d-flex align-items-center">
                  <i className="bi bi-person"></i>
                  <span>{t('Profile')}</span>
                </Link>
              </li>
              <li>
                <button className="dropdown-item d-flex align-items-center" onClick={logout}>
                  <i className="bi bi-box-arrow-right"></i>
                  <span>{t('Sign Out')}</span>
                </button>
              </li>
            </ul>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Navigation;
