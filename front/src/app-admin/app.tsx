import Login from './containers/login/login';
import {BrowserRouter as Router, Route, useLocation} from "react-router-dom";
import {DASHBOARD, FORGOT_PASSWORD, LOGIN, PROFILE, USERS, USERS_CREATE, USERS_EDIT, REPORTS_SALES, REPORTS_PROFIT, REPORTS_DAILY, REPORTS_VENDOR, REPORTS_CATEGORY, Z_REPORTS, INVENTORY_ALERTS} from "./routes/frontend.routes";
import {connect, useSelector} from "react-redux";
import {RootState} from "../duck/_root/root.state";
import {isUserLoggedIn} from "../duck/auth/auth.selector";
import {getBootstrapError, hasBootstrapped} from "../duck/app/app.selector";
import {bootstrap} from "../duck/app/app.action";
import {userLoggedOut} from "../duck/auth/auth.action";
import {bindActionCreators, Dispatch} from 'redux';
import {FunctionComponent, useEffect} from "react";
import {Dashboard} from "./containers/dashboard/dashboard";
import {useLogout} from "../duck/auth/hooks/useLogout";
import {Navigate, Routes} from 'react-router';
import {Error404} from "../app-common/components/error/404";
import {Users} from "./containers/dashboard/users";
import {ForgotPassword} from "./containers/forgot/forgot";
import {Profile} from "./containers/dashboard/profile/profile";
import {SalesReport} from "./containers/reports/sales-report";
import {ProfitReport} from "./containers/reports/profit-report";
import {DailyReport} from "./containers/reports/daily-report";
import {StockAlerts} from "./containers/inventory/stock-alerts";
import {RequireRole} from "../app-common/components/auth/RequireRole";
import {ZReportPage} from "./containers/closing/z-report-page";
import {VendorReport} from "./containers/reports/vendor-report";
import {CategoryReport} from "./containers/reports/category-report";

export interface AppProps {
  bootstrap: () => void;
  userLoggedOut: () => void;
  isLoggedIn?: boolean;
  hasBootstrapped?: boolean;
  bootstrapError?: Error;
}


const AppComponent: FunctionComponent<AppProps> = (props) => {

  const [logoutState, logoutAction] = useLogout();

  useEffect(() => {
    props.bootstrap();

    function handleException(e: any) {
      if (e.reason.code === 401) {
        logoutAction();
      }
    }

    window.addEventListener('unhandledrejection', handleException);

    return () => window.removeEventListener('unhandledrejection', handleException);
  }, []);

  const {isLoggedIn, hasBootstrapped, bootstrapError} = props;

  if (!!bootstrapError) {
    return <div>An error occurred while initializing application</div>;
  }

  if (!hasBootstrapped) {
    return null;
  }


  return (
    <Router>
      <Routes>
        <Route path={LOGIN} element={
          <>
            {isLoggedIn ? <Navigate to={DASHBOARD}/> : <Login/>}
          </>
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

        <Route path={INVENTORY_ALERTS} element={<RequireAuth><RequireRole role="ROLE_MANAGER"><StockAlerts/></RequireRole></RequireAuth>}/>

        {/*if nothing matches show 404*/}
        <Route path="*" element={<Error404/>}/>
      </Routes>
    </Router>
  );
};

export const App = connect(
  (state: RootState) => ({
    isLoggedIn: isUserLoggedIn(state),
    hasBootstrapped: hasBootstrapped(state),
    bootstrapError: getBootstrapError(state),
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
