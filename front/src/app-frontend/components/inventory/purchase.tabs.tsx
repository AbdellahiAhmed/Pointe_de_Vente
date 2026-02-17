import { Button } from "../../../app-common/components/input/button";
import React, { FC, PropsWithChildren, useState } from "react";
import { Modal } from "../../../app-common/components/modal/modal";
import {
  Tab,
  TabContent,
  TabControl,
  TabNav,
} from "../../../app-common/components/tabs/tabs";
import { Suppliers } from "./supplier/suppliers";
import { PurchaseOrders } from "./purchase-orders/purchase.orders";
import { Purchases } from "./purchase/purchases";
import {useTranslation} from "react-i18next";

interface Props extends PropsWithChildren {}

export const PurchaseTabs: FC<Props> = ({ children }) => {
  const {t} = useTranslation();
  const [modal, setModal] = useState(false);

  return (
    <>
      <Button
        variant="primary"
        onClick={() => {
          setModal(true);
        }}
        size="lg"
        tabIndex={-1}>
        {children || t("Inventory")}
      </Button>

      <Modal
        open={modal}
        onClose={() => {
          setModal(false);
        }}
        title={t("Inventory")}
        size="full"
        transparentContainer={false}>
        <TabControl
          defaultTab="purchases"
          position="left"
          render={({ isTabActive, setActiveTab, activeTab }) => (
            <>
              <TabNav position="left">
                <Tab
                  isActive={isTabActive("purchases")}
                  onClick={() => setActiveTab("purchases")}>
                  {t("Purchases")}
                </Tab>
                <Tab
                  isActive={isTabActive("purchase_orders")}
                  onClick={() => setActiveTab("purchase_orders")}>
                  {t("Purchase Orders")}
                </Tab>
                <Tab
                  isActive={isTabActive("suppliers")}
                  onClick={() => setActiveTab("suppliers")}>
                  {t("Suppliers")}
                </Tab>
              </TabNav>
              <TabContent isActive={isTabActive("purchases")}>
                <Purchases />
              </TabContent>
              <TabContent isActive={isTabActive("purchase_orders")}>
                <PurchaseOrders />
              </TabContent>
              <TabContent isActive={isTabActive("suppliers")}>
                <Suppliers />
              </TabContent>
            </>
          )}
        />
      </Modal>
    </>
  );
};
