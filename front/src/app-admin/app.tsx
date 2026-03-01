import Login from './containers/login/login';
import {BrowserRouter as Router, Route, useLocation} from "react-router-dom";
import {DASHBOARD, FORGOT_PASSWORD, LOGIN, PROFILE, USERS, USERS_CREATE, USERS_EDIT, REPORTS_SALES, REPORTS_PROFIT, REPORTS_DAILY, REPORTS_VENDOR, REPORTS_CATEGORY, Z_REPORTS, BANK_JOURNAL, INVENTORY_ALERTS, STOCK_ADJUSTMENT, STOCK_MOVEMENTS, RETURN_REQUESTS, CUSTOMERS_REPORT, SYSTEM_HEALTH, AUDIT_LOG, SETUP} from "./routes/frontend.routes";
import {connect, useSelector} from "react-redux";
import {useTranslation} from "react-i18next";
import {RootState} from "../duck/_root/root.state";
import {isUserLoggedIn} from "../duck/auth/auth.selector";
import {getBootstrapError, getNeedsSetup, hasBootstrapped} from "../duck/app/app.selector";
import {bootstrap} from "../duck/app/app.action";
import {userLoggedOut} from "../duck/auth/auth.action";
import {bindActionCreators, Dispatch} from 'redux';
import {FunctionComponent, lazy, Suspense, useEffect} from "react";
import {Dashboard} from "./containers/dashboard/dashboard";
import {useLogout} from "../duck/auth/hooks/useLogout";
import {Navigate, Routes} from 'react-router';
import {Error404} from "../app-common/components/error/404";
import {ErrorBoundary} from "../app-common/components/error/error-boundary";
import {ForgotPassword} from "./containers/forgot/forgot";
import {Profile} from "./containers/dashboard/profile/profile";
import {RequireRole} from "../app-common/components/auth/RequireRole";
import {Setup} from "../app-common/components/setup/setup";

// Lazy-loaded pages (reports, inventory, admin)
const Users = lazy(() => import('./containers/dashboard/users').then(m => ({default: m.Users})));
const SalesReport = lazy(() => import('./containers/reports/sales-report').then(m => ({default: m.SalesReport})));
const ProfitReport = lazy(() => import('./containers/reports/profit-report').then(m => ({default: m.ProfitReport})));
const DailyReport = lazy(() => import('./containers/reports/daily-report').then(m => ({default: m.DailyReport})));
const VendorReport = lazy(() => import('./containers/reports/vendor-report').then(m => ({default: m.VendorReport})));
const CategoryReport = lazy(() => import('./containers/reports/category-report').then(m => ({default: m.CategoryReport})));
const ZReportPage = lazy(() => import('./containers/closing/z-report-page').then(m => ({default: m.ZReportPage})));
const BankJournal = lazy(() => import('./containers/bank-journal/bank-journal').then(m => ({default: m.BankJournal})));
const StockAlerts = lazy(() => import('./containers/inventory/stock-alerts').then(m => ({default: m.StockAlerts})));
const StockAdjustment = lazy(() => import('./containers/inventory/stock-adjustment').then(m => ({default: m.StockAdjustment})));
const StockMovements = lazy(() => import('./containers/inventory/stock-movements').then(m => ({default: m.StockMovements})));
const ReturnRequests = lazy(() => import('./containers/returns/return-requests').then(m => ({default: m.ReturnRequests})));
const CustomerReport = lazy(() => import('./containers/reports/customer-report').then(m => ({default: m.CustomerReport})));
const SystemHealth = lazy(() => import('./containers/system/system-health').then(m => ({default: m.SystemHealth})));
const AuditLog = lazy(() => import('./containers/audit/audit-log').then(m => ({default: m.AuditLog})));

export interface AppProps {
  bootstrap: () => void;
  userLoggedOut: () => void;
  isLoggedIn?: boolean;
  hasBootstrapped?: boolean;
  bootstrapError?: Error;
  needsSetup?: boolean;
}


const AppComponent: FunctionComponent<AppProps> = (props) => {
  const {t} = useTranslation();

  const [logoutState, logoutAction] = useLogout();

  useEffect(() => {
    props.bootstrap();

    function handleException(e: any) {
      if (e.reason?.code === 401) {
        logoutAction();
      }
    }

    window.addEventListener('unhandledrejection', handleException);

    return () => window.removeEventListener('unhandledrejection', handleException);
  }, []);

  const {isLoggedIn, hasBootstrapped, bootstrapError, needsSetup} = props;

  if (!hasBootstrapped) {
    return null;
  }


  return (
    <ErrorBoundary>
    <Router>
      <Suspense fallback={<div className="d-flex justify-content-center align-items-center" style={{minHeight: '60vh'}}><div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div></div>}>
      <Routes>
        <Route path={LOGIN} element={
          <>
            {needsSetup ? <Navigate to={SETUP}/> : isLoggedIn ? <Navigate to={DASHBOARD}/> : <Login/>}
          </>
        }/>

        <Route path={SETUP} element={
          needsSetup ? <Setup loginRoute={LOGIN}/> : <Navigate to={LOGIN}/>
        }/>

        <Route path={FORGOT_PASSWORD} element={
          <>
            {isLoggedIn ? <Navigate to={DASHBOARD}/> : <ForgotPassword/>}
          </>
        }/>

        {/*Protected routes*/}
        <Route path={DASHBOARD} element={<RequireAuth><Dashboard/></RequireAuth>}/>
        <Route path={PROFILE} element={<RequireAuth><Profile/></RequireAuth>}/>

        <Route path={USERS} element={<RequireAuth><RequireRole role="ROLE_ADMIN"><Users/></RequireRole></RequireAuth>}/>
        <Route path={USERS_CREATE} element={<RequireAuth><RequireRole role="ROLE_ADMIN"><Users/></RequireRole></RequireAuth>}/>
        <Route path={USERS_EDIT} element={<RequireAuth><RequireRole role="ROLE_ADMIN"><Users/></RequireRole></RequireAuth>}/>

        <Route path={REPORTS_SALES} element={<RequireAuth><RequireRole role="ROLE_MANAGER"><SalesReport/></RequireRole></RequireAuth>}/>
        <Route path={REPORTS_PROFIT} element={<RequireAuth><RequireRole role="ROLE_MANAGER"><ProfitReport/></RequireRole></RequireAuth>}/>
        <Route path={REPORTS_DAILY} element={<RequireAuth><RequireRole role="ROLE_MANAGER"><DailyReport/></RequireRole></RequireAuth>}/>
        <Route path={REPORTS_VENDOR} element={<RequireAuth><RequireRole role="ROLE_MANAGER"><VendorReport/></RequireRole></RequireAuth>}/>
        <Route path={REPORTS_CATEGORY} element={<RequireAuth><RequireRole role="ROLE_MANAGER"><CategoryReport/></RequireRole></RequireAuth>}/>
        <Route path={Z_REPORTS} element={<RequireAuth><RequireRole role="ROLE_MANAGER"><ZReportPage/></RequireRole></RequireAuth>}/>
        <Route path={BANK_JOURNAL} element={<RequireAuth><RequireRole role="ROLE_MANAGER"><BankJournal/></RequireRole></RequireAuth>}/>

        <Route path={INVENTORY_ALERTS} element={<RequireAuth><RequireRole role="ROLE_MANAGER"><StockAlerts/></RequireRole></RequireAuth>}/>
        <Route path={STOCK_ADJUSTMENT} element={<RequireAuth><RequireRole role="ROLE_MANAGER"><StockAdjustment/></RequireRole></RequireAuth>}/>
        <Route path={STOCK_MOVEMENTS} element={<RequireAuth><RequireRole role="ROLE_MANAGER"><StockMovements/></RequireRole></RequireAuth>}/>
        <Route path={RETURN_REQUESTS} element={<RequireAuth><RequireRole role="ROLE_MANAGER"><ReturnRequests/></RequireRole></RequireAuth>}/>
        <Route path={CUSTOMERS_REPORT} element={<RequireAuth><RequireRole role="ROLE_MANAGER"><CustomerReport/></RequireRole></RequireAuth>}/>

        <Route path={SYSTEM_HEALTH} element={<RequireAuth><RequireRole role="ROLE_ADMIN"><SystemHealth/></RequireRole></RequireAuth>}/>
        <Route path={AUDIT_LOG} element={<RequireAuth><RequireRole role="ROLE_ADMIN"><AuditLog/></RequireRole></RequireAuth>}/>

        {/*if nothing matches show 404*/}
        <Route path="*" element={<Error404/>}/>
      </Routes>
      </Suspense>
    </Router>
    </ErrorBoundary>
  );
};

export const App = connect(
  (state: RootState) => ({
    isLoggedIn: isUserLoggedIn(state),
    hasBootstrapped: hasBootstrapped(state),
    bootstrapError: getBootstrapError(state),
    needsSetup: getNeedsSetup(state),
  }),
  (dispatch: Dispatch) =>
    bindActionCreators(
      {
        bootstrap: bootstrap,
        userLoggedOut,
      },
      dispatch
    )
)(AppComponent);

export const RequireAuth = ({children}: { children: JSX.Element }) => {
  let location = useLocation();
  const userLoggedIn = useSelector(isUserLoggedIn);

  if (!userLoggedIn) {
    return <Navigate
      to={LOGIN}
      state={{from: location}}
      replace
    />;
  }

  return children;
}
