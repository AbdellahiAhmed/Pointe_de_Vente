import {useSelector} from "react-redux";
import {isUserLoggedIn} from "../../../duck/auth/auth.selector";
import React from "react";
import {Link, useLocation} from "react-router-dom";
import {DASHBOARD, REPORTS_SALES, REPORTS_PROFIT, REPORTS_DAILY, REPORTS_VENDOR, REPORTS_CATEGORY, Z_REPORTS, USERS, INVENTORY_ALERTS, STOCK_ADJUSTMENT, STOCK_MOVEMENTS, RETURN_REQUESTS, CUSTOMERS_REPORT, BANK_JOURNAL, SYSTEM_HEALTH, AUDIT_LOG} from "../../routes/frontend.routes";
import classNames from "classnames";
import {useTranslation} from "react-i18next";
import {useHasRole} from "../../../duck/auth/hooks/useHasRole";

export const Sidebar = () => {
  const isLoggedIn = useSelector(isUserLoggedIn);
  const {t} = useTranslation();
  const location = useLocation();
  const isManager = useHasRole('ROLE_MANAGER');
  const isAdmin = useHasRole('ROLE_ADMIN');

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

        {isManager && (
          <>
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

            <li className="nav-item">
              <Link className={classNames(
                "nav-link", location.pathname === REPORTS_VENDOR ? 'active' : 'collapsed'
              )} to={REPORTS_VENDOR}>
                <i className="bi bi-person-badge"></i>
                <span>{t('Vendor Report')}</span>
              </Link>
            </li>

            <li className="nav-item">
              <Link className={classNames(
                "nav-link", location.pathname === REPORTS_CATEGORY ? 'active' : 'collapsed'
              )} to={REPORTS_CATEGORY}>
                <i className="bi bi-tags"></i>
                <span>{t('Category Report')}</span>
              </Link>
            </li>

            <li className="nav-item">
              <Link className={classNames(
                "nav-link", location.pathname === Z_REPORTS ? 'active' : 'collapsed'
              )} to={Z_REPORTS}>
                <i className="bi bi-file-earmark-pdf"></i>
                <span>{t('Z-Reports')}</span>
              </Link>
            </li>

            <li className="nav-item">
              <Link className={classNames(
                "nav-link", location.pathname === BANK_JOURNAL ? 'active' : 'collapsed'
              )} to={BANK_JOURNAL}>
                <i className="bi bi-bank"></i>
                <span>{t('Bank Journal')}</span>
              </Link>
            </li>
          </>
        )}

        {isManager && (
          <>
            <li className="nav-heading">{t('Inventory')}</li>

            <li className="nav-item">
              <Link className={classNames(
                "nav-link", location.pathname === INVENTORY_ALERTS ? 'active' : 'collapsed'
              )} to={INVENTORY_ALERTS}>
                <i className="bi bi-exclamation-triangle"></i>
                <span>{t('Stock Alerts')}</span>
              </Link>
            </li>

            <li className="nav-item">
              <Link className={classNames(
                "nav-link", location.pathname === STOCK_ADJUSTMENT ? 'active' : 'collapsed'
              )} to={STOCK_ADJUSTMENT}>
                <i className="bi bi-sliders"></i>
                <span>{t('Stock Adjustment')}</span>
              </Link>
            </li>

            <li className="nav-item">
              <Link className={classNames(
                "nav-link", location.pathname === STOCK_MOVEMENTS ? 'active' : 'collapsed'
              )} to={STOCK_MOVEMENTS}>
                <i className="bi bi-clock-history"></i>
                <span>{t('Stock Movements')}</span>
              </Link>
            </li>

            <li className="nav-item">
              <Link className={classNames(
                "nav-link", location.pathname === RETURN_REQUESTS ? 'active' : 'collapsed'
              )} to={RETURN_REQUESTS}>
                <i className="bi bi-arrow-return-left"></i>
                <span>{t('Return Requests')}</span>
              </Link>
            </li>

            <li className="nav-item">
              <Link className={classNames(
                "nav-link", location.pathname === CUSTOMERS_REPORT ? 'active' : 'collapsed'
              )} to={CUSTOMERS_REPORT}>
                <i className="bi bi-people-fill"></i>
                <span>{t('Customers & Credit')}</span>
              </Link>
            </li>
          </>
        )}

        {isAdmin && (
          <>
            <li className="nav-heading">{t('Administration')}</li>

            <li className="nav-item">
              <Link className={classNames(
                "nav-link", location.pathname === USERS ? 'active' : 'collapsed'
              )} to={USERS}>
                <i className="bi bi-people"></i>
                <span>{t('Users')}</span>
              </Link>
            </li>

            <li className="nav-item">
              <Link className={classNames(
                "nav-link", location.pathname === AUDIT_LOG ? 'active' : 'collapsed'
              )} to={AUDIT_LOG}>
                <i className="bi bi-journal-text"></i>
                <span>{t('Audit Log')}</span>
              </Link>
            </li>

            <li className="nav-item">
              <Link className={classNames(
                "nav-link", location.pathname === SYSTEM_HEALTH ? 'active' : 'collapsed'
              )} to={SYSTEM_HEALTH}>
                <i className="bi bi-shield-check"></i>
                <span>{t('System Health')}</span>
              </Link>
            </li>
          </>
        )}
      </ul>
    </aside>
  );
};
