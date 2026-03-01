import React, { useState, useEffect } from "react";
import { App as Frontend } from "./app-frontend/app";
import { App as Admin } from "./app-admin/app";
import reportWebVitals from "./reportWebVitals";
import "./css/index.scss";
import "bootstrap-icons/font/bootstrap-icons.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./css/admin.scss";
import { StoreFactory } from "./store/store.factory";
import { Provider } from "react-redux";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";
import { Provider as JotaiProvider, useAtom, useSetAtom } from "jotai";
import { ConfigProvider } from "antd";
import { appModeAtom, AppMode } from "./store/jotai";
import { getAuthorizedUser } from "./duck/auth/auth.selector";
import { useSelector } from "react-redux";
import "./types.d.ts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const store = StoreFactory.createStore();

const client = new ApolloClient({
  uri: import.meta.env.VITE_API_HOST,
  cache: new InMemoryCache(),
});

const AppModeRouter = () => {
  const [appMode, setAppMode] = useAtom(appModeAtom);
  const user = useSelector(getAuthorizedUser);

  // Security: force ROLE_VENDEUR users back to POS if they somehow land in admin mode
  useEffect(() => {
    if (appMode === 'admin' && user && user.roles) {
      const hasAdminAccess = user.roles.some(
        (r: string) => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER'
      );
      if (!hasAdminAccess) {
        setAppMode('pos');
      }
    }
  }, [appMode, user]);

  // If user is vendeur-only and mode is admin, render POS anyway (before atom update propagates)
  const effectiveMode = (() => {
    if (appMode === 'admin' && user && user.roles) {
      const hasAdminAccess = user.roles.some(
        (r: string) => r === 'ROLE_ADMIN' || r === 'ROLE_MANAGER'
      );
      if (!hasAdminAccess) return 'pos';
    }
    return appMode;
  })();

  return effectiveMode === 'pos' ? <Frontend /> : <Admin />;
};

const AppWithDirection = () => {
  const [direction, setDirection] = useState<'ltr' | 'rtl'>(
    i18n.dir(localStorage.getItem('locale') ?? 'fr') as 'ltr' | 'rtl'
  );
  useEffect(() => {
    const handler = (lng: string) => {
      setDirection(i18n.dir(lng) as 'ltr' | 'rtl');
    };
    i18n.on('languageChanged', handler);
    return () => { i18n.off('languageChanged', handler); };
  }, []);
  return (
    <ConfigProvider direction={direction}>
      <ApolloProvider client={client}>
        <AppModeRouter />
      </ApolloProvider>
    </ConfigProvider>
  );
};

const container = document.getElementById("root");
const root = createRoot(container!); // createRoot(container!) if you use TypeScript
root.render(
  <JotaiProvider>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>
          <AppWithDirection />
        </I18nextProvider>
      </Provider>
    </QueryClientProvider>
  </JotaiProvider>
);

// Register Service Worker for PWA / offline support
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals(console.log); // disabled in production
