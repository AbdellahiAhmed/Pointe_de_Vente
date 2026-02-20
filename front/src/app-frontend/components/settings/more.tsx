import React, { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCog,
  faUser,
  faSlidersH,
  faStore,
  faUsers,
  faTags,
  faLayerGroup,
  faCreditCard,
  faPercent,
  faMoneyBill,
  faBuilding,
  faList,
  faBarcode,
  faDesktop,
  faUndoAlt,
  faShieldAlt,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "../../../app-common/components/input/button";
import { Modal } from "../../../app-common/components/modal/modal";
import localforage from "../../../lib/localforage/localforage";
import { useDispatch, useSelector } from "react-redux";
import { getAuthorizedUser } from "../../../duck/auth/auth.selector";
import { Switch } from "../../../app-common/components/input/switch";
import { Tab, TabContent, TabControl, TabNav, } from "../../../app-common/components/tabs/tabs";
import { ReactSelect } from "../../../app-common/components/input/custom.react.select";
import { useLoadData } from "../../../api/hooks/use.load.data";
import { Stores } from "./stores/stores";
import { Users } from "./users/users";
import { PaymentTypes } from "./payment-types/payment.types";
import { DiscountTypes } from "./discounts/discount.types";
import { TaxTypes } from "./taxes/tax.types";
import { Terminals } from "./terminals/terminals";
import { Departments } from "./departments/departments";
import { Items } from "./items/items";
import { Categories } from "./categories/categories";
import { Brands } from "./brands/brands";
import { useMediaQuery } from "react-responsive";
import { message as AntMessage, Tooltip } from "antd";
import { getProgress } from "../../../duck/progress/progress.selector";
import { getStore } from "../../../duck/store/store.selector";
import { getTerminal } from "../../../duck/terminal/terminal.selector";
import { DynamicBarcodes } from "./dynamic-barcodes";
import { useAtom } from "jotai";
import { defaultData, defaultState } from "../../../store/jotai";
import { useHasRole } from "../../../duck/auth/hooks/useHasRole";
import { ReturnRequestsInline } from "./returns/return-requests-inline";

interface Props {
}

const getUserInitials = (name?: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const getRoleBadge = (roles: string[], t: (key: string) => string) => {
  if (roles.includes("ROLE_ADMIN")) {
    return { label: t("Admin"), modifier: "settings-profile-card__role-badge--admin" };
  }
  if (roles.includes("ROLE_MANAGER")) {
    return { label: t("Manager"), modifier: "settings-profile-card__role-badge--manager" };
  }
  return { label: t("Vendeur"), modifier: "settings-profile-card__role-badge--vendeur" };
};

export const More: FC<Props> = ({}) => {
  const [appState, setAppState] = useAtom(defaultState);
  const [defaultOptions, setDefaultOptions] = useAtom(defaultData);
  const {
    defaultDiscount,
    defaultPaymentType,
    defaultTax,
    enableTouch,
    customerBox, requireCustomerBox
  } = defaultOptions;
  const {t} = useTranslation();
  const [modal, setModal] = useState(false);
  const [state, action] = useLoadData();
  const [messageApi, contextHolder] = AntMessage.useMessage();

  const dispatch = useDispatch();

  const user = useSelector(getAuthorizedUser);
  const store = useSelector(getStore);
  const terminal = useSelector(getTerminal);

  const isManager = useHasRole('ROLE_MANAGER');
  const isAdmin = useHasRole('ROLE_ADMIN');

  const progress = useSelector(getProgress);

  useEffect(() => {
    if( progress === "Done" ) {
      messageApi.open({
        key: "loading",
        type: "success",
        content: `${progress}`,
      });

      setTimeout(() => messageApi.destroy(), 1000);
    } else {
      messageApi.open({
        key: "loading",
        type: "loading",
        content: `Loading ${progress}`,
        duration: 120,
      });
    }
  }, [progress]);

  const [isLoading, setLoading] = useState(false);

  const clearCache = async () => {
    setLoading(true);
    await localforage.removeItem("list");
    await localforage.removeItem("deviceList");
    await localforage.removeItem("discountList");
    await localforage.removeItem("taxList");
    await localforage.removeItem("paymentTypesList");

    setLoading(false);

    window.location.reload();
  };

  const isMobile = useMediaQuery({
    query: "(max-width: 1224px)",
  });

  const roleBadge = user ? getRoleBadge(user.roles || [], t) : null;

  return (
    <>
      {contextHolder}
      <Tooltip title={t("Settings")}>
        <Button
          variant="secondary"
          iconButton
          size="lg"
          onClick={() => {
            setModal(true);
          }}
          tabIndex={-1}>
          <FontAwesomeIcon icon={faCog}/>
        </Button>
      </Tooltip>

      <Modal
        open={modal}
        onClose={() => {
          setModal(false);
        }}
        title={t("Settings")}
        size="full"
        transparentContainer={false}>
        <div className="settings-panel">
          <TabControl
            defaultTab="profile"
            position={isMobile ? "top" : "left"}
            render={({ isTabActive, setActiveTab }) => (
              <>
                <TabNav position={isMobile ? "top" : "left"}>
                  {/* ── Section: General ── */}
                  <span className="settings-section-label">{t("General")}</span>
                  <Tab
                    isActive={isTabActive("profile")}
                    onClick={() => setActiveTab("profile")}
                    icon={<FontAwesomeIcon icon={faUser} />}>
                    {t("Profile")}
                  </Tab>
                  <Tab
                    isActive={isTabActive("general")}
                    onClick={() => setActiveTab("general")}
                    icon={<FontAwesomeIcon icon={faSlidersH} />}>
                    {t("General")}
                  </Tab>

                  {/* ── Section: Commerce (Manager+) ── */}
                  {isManager && (
                    <>
                      <span className="settings-section-label">{t("Commerce")}</span>
                      <Tab
                        isActive={isTabActive("stores")}
                        onClick={() => setActiveTab("stores")}
                        icon={<FontAwesomeIcon icon={faStore} />}>
                        {t("Stores")}
                      </Tab>
                      <Tab
                        isActive={isTabActive("brands")}
                        onClick={() => setActiveTab("brands")}
                        icon={<FontAwesomeIcon icon={faTags} />}>
                        {t("Brands")}
                      </Tab>
                      <Tab
                        isActive={isTabActive("categories")}
                        onClick={() => setActiveTab("categories")}
                        icon={<FontAwesomeIcon icon={faLayerGroup} />}>
                        {t("Categories")}
                      </Tab>
                      <Tab
                        isActive={isTabActive("list")}
                        onClick={() => setActiveTab("list")}
                        icon={<FontAwesomeIcon icon={faList} />}>
                        {t("Items list")}
                      </Tab>
                      <Tab
                        isActive={isTabActive("payments")}
                        onClick={() => setActiveTab("payments")}
                        icon={<FontAwesomeIcon icon={faCreditCard} />}>
                        {t("Payment types")}
                      </Tab>
                      <Tab
                        isActive={isTabActive("discounts")}
                        onClick={() => setActiveTab("discounts")}
                        icon={<FontAwesomeIcon icon={faPercent} />}>
                        {t("Discounts")}
                      </Tab>
                      <Tab
                        isActive={isTabActive("taxes")}
                        onClick={() => setActiveTab("taxes")}
                        icon={<FontAwesomeIcon icon={faMoneyBill} />}>
                        {t("Taxes")}
                      </Tab>
                      <Tab
                        isActive={isTabActive("barcodes")}
                        onClick={() => setActiveTab("barcodes")}
                        icon={<FontAwesomeIcon icon={faBarcode} />}>
                        {t("Barcodes")}
                      </Tab>
                      <Tab
                        isActive={isTabActive("returns")}
                        onClick={() => setActiveTab("returns")}
                        icon={<FontAwesomeIcon icon={faUndoAlt} />}>
                        {t("Return Requests")}
                      </Tab>
                    </>
                  )}

                  {/* ── Section: Administration (Admin only) ── */}
                  {isAdmin && (
                    <>
                      <span className="settings-section-label">{t("Administration")}</span>
                      <Tab
                        isActive={isTabActive("users")}
                        onClick={() => setActiveTab("users")}
                        icon={<FontAwesomeIcon icon={faUsers} />}>
                        {t("Users")}
                      </Tab>
                      <Tab
                        isActive={isTabActive("departments")}
                        onClick={() => setActiveTab("departments")}
                        icon={<FontAwesomeIcon icon={faBuilding} />}>
                        {t("Departments")}
                      </Tab>
                      <Tab
                        isActive={isTabActive("terminals")}
                        onClick={() => setActiveTab("terminals")}
                        icon={<FontAwesomeIcon icon={faDesktop} />}>
                        {t("Terminals")}
                      </Tab>
                    </>
                  )}
                </TabNav>

                {/* ── Profile Tab ── */}
                <TabContent isActive={isTabActive("profile")}>
                  <div className="settings-content">
                    <div className="settings-profile-card">
                      <div className="settings-profile-card__hero">
                        <div className="settings-profile-card__avatar">
                          {getUserInitials(user?.displayName)}
                        </div>
                        <div className="settings-profile-card__hero-info">
                          <div className="settings-profile-card__name">{user?.displayName}</div>
                          {roleBadge && (
                            <span className={`settings-profile-card__role-badge ${roleBadge.modifier}`}>
                              <FontAwesomeIcon icon={faShieldAlt} />
                              {roleBadge.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="settings-profile-card__info">
                        <div className="settings-profile-card__info-row">
                          <div className="settings-profile-card__info-row-icon">
                            <FontAwesomeIcon icon={faStore} />
                          </div>
                          <div>
                            <div className="settings-profile-card__info-row-label">{t("Store")}</div>
                            <div className="settings-profile-card__info-row-value">{store?.name || "—"}</div>
                          </div>
                        </div>
                        <div className="settings-profile-card__info-row">
                          <div className="settings-profile-card__info-row-icon">
                            <FontAwesomeIcon icon={faDesktop} />
                          </div>
                          <div>
                            <div className="settings-profile-card__info-row-label">{t("Terminal")}</div>
                            <div className="settings-profile-card__info-row-value">{terminal?.code || "—"}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabContent>

                {/* ── General Tab ── */}
                <TabContent isActive={isTabActive("general")}>
                  <div className="settings-content">
                    <h2 className="settings-content-title">{t("General")}</h2>
                    <p className="settings-content-subtitle">{t("Cache and display preferences")}</p>

                    <div className="settings-card">
                      <div className="settings-card__header">
                        <h3 className="settings-card__title">{t("Cache")}</h3>
                      </div>
                      <div className="settings-card__body">
                        <Button
                          variant="success"
                          onClick={() => { clearCache(); }}
                          size="lg"
                          disabled={isLoading}>
                          {isLoading ? t("Clearing...") : t("Refresh Browser Cache")}
                        </Button>
                      </div>
                    </div>

                    <div className="settings-card">
                      <div className="settings-card__header">
                        <h3 className="settings-card__title">{t("Display")}</h3>
                      </div>
                      <div className="settings-card__body">
                        <div className="settings-card__row">
                          <div>
                            <div className="settings-card__row-label">{t("Enable Touch support?")}</div>
                            <div className="settings-card__row-description">{t("Experimental")}</div>
                          </div>
                          <div className="settings-card__row-control">
                            <Switch
                              checked={enableTouch}
                              onChange={(value) => {
                                setDefaultOptions((prev) => ({
                                  ...prev,
                                  enableTouch: value.target.checked,
                                }));
                              }}
                            />
                          </div>
                        </div>
                        <div className="settings-card__row">
                          <div>
                            <div className="settings-card__row-label">{t("Show customer input?")}</div>
                          </div>
                          <div className="settings-card__row-control">
                            <Switch
                              checked={customerBox}
                              onChange={(value) => {
                                setDefaultOptions((prev) => ({
                                  ...prev,
                                  customerBox: value.target.checked,
                                }));
                                if(!value.target.checked) {
                                  setDefaultOptions((prev) => ({
                                    ...prev,
                                    requireCustomerBox: false
                                  }));
                                }
                              }}
                            />
                          </div>
                        </div>
                        {customerBox && (
                          <div className="settings-card__row">
                            <div>
                              <div className="settings-card__row-label">{t("Require customer name with every order?")}</div>
                            </div>
                            <div className="settings-card__row-control">
                              <Switch
                                checked={requireCustomerBox}
                                onChange={(value) => {
                                  setDefaultOptions((prev) => ({
                                    ...prev,
                                    requireCustomerBox: value.target.checked,
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="settings-card">
                      <div className="settings-card__header">
                        <h3 className="settings-card__title">{t("Default options")}</h3>
                      </div>
                      <div className="settings-card__body">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label style={{fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block', color: 'var(--pos-text-muted)'}}>{t("Tax")}</label>
                            <ReactSelect
                              options={state.taxList.list.map((item) => ({
                                label: item.name + " " + item.rate,
                                value: JSON.stringify(item),
                              }))}
                              isClearable
                              onChange={(value: any) => {
                                if( value ) {
                                  setAppState((prev) => ({ ...prev, tax: JSON.parse(value.value) }));
                                  setDefaultOptions((prev) => ({ ...prev, defaultTax: JSON.parse(value.value) }));
                                } else {
                                  setAppState((prev) => ({ ...prev, tax: undefined }));
                                  setDefaultOptions((prev) => ({ ...prev, defaultTax: undefined }));
                                }
                              }}
                              value={
                                defaultTax
                                  ? { label: defaultTax?.name + " " + defaultTax?.rate, value: JSON.stringify(defaultTax) }
                                  : null
                              }
                            />
                          </div>
                          <div>
                            <label style={{fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block', color: 'var(--pos-text-muted)'}}>{t("Discount")}</label>
                            <ReactSelect
                              options={state.discountList.list.map((item) => ({
                                label: item.name,
                                value: JSON.stringify(item),
                              }))}
                              isClearable
                              onChange={(value: any) => {
                                if( value ) {
                                  setAppState((prev) => ({ ...prev, discount: JSON.parse(value.value) }));
                                  setDefaultOptions((prev) => ({ ...prev, defaultDiscount: JSON.parse(value.value) }));
                                } else {
                                  setAppState((prev) => ({ ...prev, discount: undefined }));
                                  setDefaultOptions((prev) => ({ ...prev, defaultDiscount: undefined }));
                                }
                              }}
                              value={
                                defaultDiscount
                                  ? { label: defaultDiscount?.name, value: JSON.stringify(defaultDiscount) }
                                  : null
                              }
                            />
                          </div>
                          <div>
                            <label style={{fontSize: '13px', fontWeight: 600, marginBottom: '4px', display: 'block', color: 'var(--pos-text-muted)'}}>{t("Payment type")}</label>
                            <ReactSelect
                              options={state.paymentTypesList.list.map((item) => ({
                                label: item.name,
                                value: JSON.stringify(item),
                              }))}
                              isClearable
                              onChange={(value: any) => {
                                if( value ) {
                                  setDefaultOptions((prev) => ({ ...prev, defaultPaymentType: JSON.parse(value.value) }));
                                } else {
                                  setDefaultOptions((prev) => ({ ...prev, defaultPaymentType: undefined }));
                                }
                              }}
                              value={
                                defaultPaymentType
                                  ? { label: defaultPaymentType?.name, value: JSON.stringify(defaultPaymentType) }
                                  : null
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabContent>

                {/* ── Commerce Tabs (Manager+) ── */}
                {isManager && (
                  <>
                    <TabContent isActive={isTabActive("stores")}>
                      <Stores/>
                    </TabContent>
                    <TabContent isActive={isTabActive("brands")}>
                      <Brands/>
                    </TabContent>
                    <TabContent isActive={isTabActive("categories")}>
                      <Categories/>
                    </TabContent>
                    <TabContent isActive={isTabActive("list")}>
                      <Items/>
                    </TabContent>
                    <TabContent isActive={isTabActive("payments")}>
                      <PaymentTypes/>
                    </TabContent>
                    <TabContent isActive={isTabActive("discounts")}>
                      <DiscountTypes/>
                    </TabContent>
                    <TabContent isActive={isTabActive("taxes")}>
                      <TaxTypes/>
                    </TabContent>
                    <TabContent isActive={isTabActive("barcodes")}>
                      <DynamicBarcodes/>
                    </TabContent>
                    <TabContent isActive={isTabActive("returns")}>
                      <div className="settings-content">
                        <h2 className="settings-content-title">{t("Return Requests")}</h2>
                        <p className="settings-content-subtitle">{t("Manage product return requests from vendors")}</p>
                        <ReturnRequestsInline />
                      </div>
                    </TabContent>
                  </>
                )}

                {/* ── Administration Tabs (Admin only) ── */}
                {isAdmin && (
                  <>
                    <TabContent isActive={isTabActive("users")}>
                      <Users/>
                    </TabContent>
                    <TabContent isActive={isTabActive("departments")}>
                      <Departments/>
                    </TabContent>
                    <TabContent isActive={isTabActive("terminals")}>
                      <Terminals/>
                    </TabContent>
                  </>
                )}
              </>
            )}
          />
        </div>
      </Modal>
    </>
  );
};
