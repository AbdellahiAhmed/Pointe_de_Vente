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
import { Provider as JotaiProvider, atom, useAtom, useSetAtom } from "jotai";
import type { PrimitiveAtom } from "jotai";
import { ConfigProvider } from "antd";
import "./types.d.ts";

const queryClient = new QueryClient();

const store = StoreFactory.createStore();

const client = new ApolloClient({
  uri: import.meta.env.VITE_API_HOST,
  cache: new InMemoryCache(),
});

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
        {import.meta.env.VITE_APP_TYPE === "frontend" ? (
          <Frontend />
        ) : (
          <Admin />
        )}
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

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// reportWebVitals(console.log); // disabled in production
