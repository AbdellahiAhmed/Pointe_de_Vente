import React, {FunctionComponent} from 'react';
import { DashboardLayout } from '../../../app-admin/containers/layout/dashboard.layout';
import {useTranslation} from "react-i18next";
import {useSelector} from "react-redux";
import {getAuthorizedUser} from "../../../duck/auth/auth.selector";
import {Link} from "react-router-dom";
import {POS} from "../../routes/frontend.routes";

interface DashboardProps {}

export const Dashboard: FunctionComponent<DashboardProps> = () => {
  const {t} = useTranslation();
  const user = useSelector(getAuthorizedUser);

  return (
    <DashboardLayout
      title={t("Dashboard")}
      breadCrumbs={[
        {title: t('Home')},
        {title: t('Dashboard'), current: true},
      ]}
    >
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-body text-center py-5">
              <i className="bi bi-shop" style={{fontSize: 64, color: 'var(--adm-accent, #4154f1)'}}></i>
              <h3 className="card-title mt-3">
                {t("Welcome")}, {user?.displayName}
              </h3>
              <p className="text-muted mb-4">
                {t("Use the POS interface to manage sales and transactions.")}
              </p>
              <Link to={POS} className="btn btn-primary btn-lg">
                <i className="bi bi-cart3 me-2"></i>
                {t("Open POS")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
