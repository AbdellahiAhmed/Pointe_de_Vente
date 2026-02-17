import {useSelector} from "react-redux";
import {isUserLoggedIn} from "../../../duck/auth/auth.selector";
import React from "react";
import {Link, useLocation} from "react-router-dom";
import {DASHBOARD, REPORTS_SALES, REPORTS_PROFIT, REPORTS_DAILY} from "../../routes/frontend.routes";
import classNames from "classnames";
import {useTranslation} from "react-i18next";

export const Sidebar = () => {
  const isLoggedIn = useSelector(isUserLoggedIn);
  const {t} = useTranslation();

  const location = useLocation();

  if (!isLoggedIn) {
    return (<></>);
  }

  return (
    <aside id="sidebar" className="sidebar">
      <ul className="sidebar-nav" id="sidebar-nav">
        <li className="nav-item">
          <Link className={classNames(
            "nav-link", location.pathname === DASHBOARD ? 'active' : 'collapsed'
          )} to={DASHBOARD}>
            <i className="bi bi-grid"></i>
            <span>{t('Dashboard')}</span>
          </Link>
        </li>

        <li className="nav-heading">{t('Reports')}</li>

        <li className="nav-item">
          <Link className={classNames(
            "nav-link", location.pathname === REPORTS_SALES ? 'active' : 'collapsed'
          )} to={REPORTS_SALES}>
            <i className="bi bi-cart-check"></i>
            <span>{t('Sales Report')}</span>
          </Link>
        </li>

        <li className="nav-item">
          <Link className={classNames(
            "nav-link", location.pathname === REPORTS_PROFIT ? 'active' : 'collapsed'
          )} to={REPORTS_PROFIT}>
            <i className="bi bi-graph-up-arrow"></i>
            <span>{t('Profit Report')}</span>
          </Link>
        </li>

        <li className="nav-item">
          <Link className={classNames(
            "nav-link", location.pathname === REPORTS_DAILY ? 'active' : 'collapsed'
          )} to={REPORTS_DAILY}>
            <i className="bi bi-calendar-day"></i>
            <span>{t('Daily Report')}</span>
          </Link>
        </li>
      </ul>
    </aside>
  );
};
