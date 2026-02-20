import { useCallback, useEffect, useMemo, useRef, useState, } from "react";
import { useTranslation } from "react-i18next";
import { HomeProps, initialData, useLoadData, } from "../../../api/hooks/use.load.data";
import { getStore } from "../../../duck/store/store.selector";
import { getTerminal } from "../../../duck/terminal/terminal.selector";
import { useSelector } from "react-redux";
import { defaultData, defaultState } from "../../../store/jotai";
import { faBarcode, faReply, faRotateRight, } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAtom } from "jotai";
import localforage from "localforage";
import { Controller, useForm } from "react-hook-form";
import { CartItem } from "../../../api/model/cart.item";
import { fetchJson, jsonRequest } from "../../../api/request/request";
import { BARCODE_LIST, PRODUCT_LIST, } from "../../../api/routing/routes/backend.app";
import { notify } from "../../../app-common/components/confirm/notification";
import { getRealProductPrice, scrollToBottom, } from "../../containers/dashboard/pos";
import { CartContainer } from "../cart/cart.container";
import { CartControls } from "../cart/cart.controls";
import { SaleFind } from "../sale/sale.find";
import { CloseSaleInline } from "../sale/sale.inline";
import { SearchTable } from "../search/search.table";
import { Product } from "../../../api/model/product";
import { ProductVariant } from "../../../api/model/product.variant";
import { Brand } from "../../../api/model/brand";
import { Category } from "../../../api/model/category";
import { Department } from "../../../api/model/department";
import { Barcode } from "../../../api/model/barcode";
import Mousetrap from "mousetrap";
import { Order } from "../../../api/model/order";
import { Tooltip } from "antd";
import { Button } from "../../../app-common/components/input/button";
import { Input } from "../../../app-common/components/input/input";
import { TopbarRight } from "./topbar.right";
import { Footer } from "./footer";
import { TrapFocus } from "../../../app-common/components/container/trap.focus";
import { SearchVariants } from "../search/search.variants";
import { ProductGrid } from "../search/product.grid";
import { QuantityChangeModal } from "../sale/quantity-change.modal";
import { PriceChangeModal } from "../sale/price-change.modal";

enum SearchModes {
  sale = "sale",
  refund = "refund",
  reorder = "reorder",
}

export const PosMode = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useState(SearchModes.sale);

  const [list, setList] = useState<HomeProps["list"]>(initialData);
  const [paymentTypesList, setPaymentTypesList] =
    useState<HomeProps["paymentTypesList"]>(initialData);
  const store = useSelector(getStore);
  const terminal = useSelector(getTerminal);

  const [state] = useLoadData();
  const [appState, setAppState] = useAtom(defaultState);

  const [appSettings] = useAtom(defaultData);
  const {
    customerBox
  } = appSettings;

  const {
    q,
    added,
    rate,
    customerName
  } = appState;

  useEffect(() => {
    setList(state.list);
    setPaymentTypesList(state.paymentTypesList);
  }, [state.list, state.paymentTypesList]);

  // Reload products directly from API when admin panel mutates products
  const reloadProductsFromApi = useCallback(async () => {
    const products: Product[] = [];
    const fetchPage = async (page: number) => {
      const res = await jsonRequest(`${PRODUCT_LIST}?itemsPerPage=100&page=${page}&isActive=true`);
      const data = await res.json();
      products.push(...data['hydra:member']);
      if (data['hydra:member'].length > 0) {
        await fetchPage(page + 1);
      }
    };
    await fetchPage(1);
    const freshList = { list: products };
    await localforage.setItem('list', freshList);
    setList(freshList);
  }, []);

  useEffect(() => {
    const handler = () => { reloadProductsFromApi(); };
    window.addEventListener('products-changed', handler);
    return () => window.removeEventListener('products-changed', handler);
  }, [reloadProductsFromApi]);

  const searchField = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [modal, setModal] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [selectedCartItem, setSelectedCartItem] = useState<CartItem | null>(null);
  const [brands, setBrands] = useState<{ [key: string]: Brand }>({});
  const [categories, setCategories] = useState<{ [key: string]: Category }>({});
  const [departments, setDepartment] = useState<{ [key: string]: Department }>(
    {}
  );

  const items = useMemo(() => {
    let filtered = list?.list || [];

    if( !filtered ) {
      return [];
    }

    // filter products by store
    if( store && filtered ) {
      filtered = filtered.filter((item) => {
        if( item?.stores?.length > 0 ) {
          const stores = item.stores.map((item) => {
            if( item.store ) {
              return item.store.id;
            }
          });

          return stores.includes(store.id);
        } else {
          return true;
        }
      });
    }

    //filter products by terminal
    if( terminal && filtered ) {
      filtered = filtered.filter((item) => {
        if( item?.terminals?.length > 0 ) {
          const terminals = item.terminals.map((item) => item.id);

          return terminals.includes(terminal.id);
        } else {
          return true;
        }
      });
    }

    const brandIds = Object.keys(brands);
    if( brandIds.length > 0 ) {
      filtered = filtered.filter((item) => {
        if( item?.brands?.length > 0 ) {
          const brandsFilter = item.brands.filter((b) => {
            return brandIds.includes(b.id.toString());
          });

          return brandsFilter.length > 0;
        }

        return false;
      });
    }

    const categoryIds = Object.keys(categories);
    if( categoryIds.length > 0 ) {
      filtered = filtered.filter((item) => {
        if( item?.categories?.length > 0 ) {
          const categoriesFilter = item.categories.filter((c) => {
            return categoryIds.includes(c.id.toString());
          });

          return categoriesFilter.length > 0;
        } else {
          return true;
        }
      });
    }

    const departmentIds = Object.keys(departments);
    if( departmentIds.length > 0 ) {
      filtered = filtered.filter((item) => {
        if( item?.department ) {
          return departmentIds.includes(item.department.id.toString());
        }

        return false;
      });
    }

    if( filtered ) {
      filtered = filtered.filter((item) => {
        if(
          item?.barcode &&
          item?.barcode.toLowerCase().startsWith(q.toLowerCase())
        ) {
          return true;
        }

        return item?.name?.toLowerCase().indexOf(q.toLowerCase()) !== -1;
      });
    }

    return filtered;
  }, [list?.list, q, brands, categories, departments, terminal, store]);

  const itemsMap = useMemo(() => {
    const newItems = [...items];
    const map = new Map();
    newItems.forEach((item) => {
      const i = {
        item,
        isVariant: false,
        variant: undefined,
      };
      map.set(item.barcode, i);
      map.set(item.name, i);

      if( item.variants.length > 0 ) {
        item.variants.forEach((variant) => {
          if( variant.barcode ) {
            const v = {
              isVariant: true,
              variant,
              item,
            };

            map.set(variant.barcode, v);
          }
        });
      }
    });

    return map;
  }, [items]);

  const { handleSubmit, control, reset } = useForm();

  const searchAction = async (values: any) => {

    const item = itemsMap.get(values.q);

    if( item === undefined ) {
      // check in DB for dynamic barcode item
      try {
        const response = await fetchJson(`${BARCODE_LIST}?barcode=${values.q}`);
        if( response["hydra:member"].length > 0 ) {
          const item: Barcode = response["hydra:member"][0];
          if( item.variant ) {
            await addItemVariant(
              item.item,
              item.variant,
              Number(item.measurement),
              Number(item.price)
            );
          }

          if( !item.variant ) {
            await addItem(
              item.item,
              Number(item.measurement),
              Number(item.price)
            );
          }
        } else {
          notify({
            type: "error",
            description: `${values.q} not found`,
            placement: "top",
            duration: 1,
          });
        }
      } catch ( e ) {
        console.log(e);
      }
    }

    if( item !== undefined ) {
      // if main item, add it
      if( !item.isVariant ) {
        await addItem(item.item, Number(values.quantity));
      }

      // if variant add it
      if( item.isVariant ) {
        await addItemVariant(item.item, item.variant, Number(values.quantity));
      }
    }

    reset({
      q: "",
      quantity: 1,
    });
  };

  const getProductStock = (item: Product): number => {
    if( store && item.stores?.length > 0 ) {
      const productStore = item.stores.find(s => s.store?.id === store.id);
      return productStore ? Number(productStore.quantity || 0) : 0;
    }
    return item.stores?.reduce((sum, s) => sum + Number(s.quantity || 0), 0)
      ?? item.quantity ?? 0;
  };

  const addItem = async (item: Product, quantity: number, price?: number) => {
    let newPrice = 0;
    if( item.basePrice ) {
      newPrice = item.basePrice;
    }

    if( price ) {
      newPrice = price;
    }

    if( rate ) {
      newPrice = rate;
    }

    setAppState((prev) => ({
      ...prev,
      latest: item,
      quantity: quantity,
      latestVariant: undefined
    }));

    if( item.variants.length > 0 ) {
      //choose from variants
      setModal(true);
      setModalTitle(`${t("Choose a variant for")} ${item.name}`);
      setVariants(item.variants);

      setAppState((prev) => ({
        ...prev,
        selectedVariant: 0,
        quantity: quantity,
      }));

      return false;
    }

    // Stock validation
    if( item.manageInventory ) {
      const availableStock = getProductStock(item);
      const alreadyInCart = added.find(a => a.item.id === item.id)?.quantity || 0;
      if( alreadyInCart + quantity > availableStock ) {
        notify({
          type: "error",
          title: t("Stock insufficient"),
          description: `${item.name}: ${t("available")} ${availableStock}, ${t("in cart")} ${alreadyInCart}`,
          placement: "top",
          duration: 3,
        });
        return false;
      }
    }

    const oldItems = added;
    let index = oldItems.findIndex((addItem) => addItem.item.id === item.id);
    if( index !== -1 ) {
      oldItems[index].quantity += quantity;
      setAppState((prev) => ({
        ...prev,
        latestIndex: index,
      }));
    } else {
      oldItems.push({
        quantity: quantity,
        item: item,
        price: newPrice,
        discount: 0,
        taxes: item.taxes,
        taxIncluded: true,
        stock: 0,
      });

      setAppState((prev) => ({
        ...prev,
        latestIndex: oldItems.length - 1,
      }));
    }

    setAppState((prev) => ({
      ...prev,
      added: oldItems,
      q: "",
      quantity: 1,
      // selected: items.findIndex((i) => i.id === item.id),
    }));

    scrollToBottom(containerRef.current);
  };

  const addItemVariant = async (
    item: Product,
    variant: ProductVariant,
    quantity: number,
    price?: number
  ) => {
    // Stock validation for variants
    if( item.manageInventory ) {
      const availableStock = getProductStock(item);
      const alreadyInCart = added
        .filter(a => a.item.id === item.id)
        .reduce((sum, a) => sum + a.quantity, 0);
      if( alreadyInCart + quantity > availableStock ) {
        notify({
          type: "error",
          title: t("Stock insufficient"),
          description: `${item.name}: ${t("available")} ${availableStock}, ${t("in cart")} ${alreadyInCart}`,
          placement: "top",
          duration: 3,
        });
        return false;
      }
    }

    const oldItems = added;
    let index = oldItems.findIndex((addItem) => {
      return addItem.item.id === item.id && addItem.variant === variant;
    });

    const variantPrice = price ? price : (variant?.price
      ? variant.price
      : getRealProductPrice(item));

    if( index !== -1 ) {
      oldItems[index].quantity += quantity;
    } else {
      oldItems.push({
        quantity: quantity,
        item: item,
        price: variantPrice,
        variant: variant,
        discount: 0,
        taxes: item.taxes,
        taxIncluded: true,
        stock: 0,
      });
    }

    setAppState((prev) => ({
      ...prev,
      latest: item,
      added: oldItems,
      selected: items.findIndex((i) => i.id === item.id),
      quantity: 1,
      selectedVariant: 0,
      q: "",
      latestQuantity: quantity,
      latestRate: variantPrice,
      latestVariant: variant,
    }));

    setModal(false);
    setVariants([]);

    scrollToBottom(containerRef.current);
  };

  useEffect(() => {
    if( added.length === 0 ) {
      setAppState((prev) => ({
        ...prev,
        adjustment: 0,
      }));
    }
  }, [added]);

  useEffect(() => {
    //set default discount, tax
    setDefaultOptions();
  }, []);

  const setDefaultOptions = () => {
    localforage.getItem("defaultDiscount").then((data: any) => {
      setAppState((prev) => ({
        ...prev,
        discount: data,
      }));
    });
    localforage.getItem("defaultTax").then((data: any) => {
      setAppState((prev) => ({
        ...prev,
        tax: data,
      }));
    });
  };

  // ── Keyboard Shortcuts ──
  const getSelectedCartItem = useCallback((): CartItem | null => {
    const idx = appState.cartItem ?? (added.length > 0 ? added.length - 1 : -1);
    return idx >= 0 && idx < added.length ? added[idx] : null;
  }, [appState.cartItem, added]);

  useEffect(() => {
    // F1 - Change quantity
    Mousetrap.bind("f1", (e) => {
      e.preventDefault();
      const item = getSelectedCartItem();
      if (item) {
        setSelectedCartItem(item);
        setQuantityModalOpen(true);
      }
    });

    // F2 - Change price
    Mousetrap.bind("f2", (e) => {
      e.preventDefault();
      const item = getSelectedCartItem();
      if (item) {
        setSelectedCartItem(item);
        setPriceModalOpen(true);
      }
    });

    // F3 - Focus search
    Mousetrap.bind("f3", (e) => {
      e.preventDefault();
      searchField.current?.focus();
    });

    // F12 - Trigger pay (click the settle button)
    Mousetrap.bind("f12", (e) => {
      e.preventDefault();
      const settleBtn = document.querySelector(".pos-settle-btn") as HTMLButtonElement;
      settleBtn?.click();
    });

    // Del - Remove selected item from cart
    Mousetrap.bind("del", (e) => {
      if (document.body.classList.contains("ReactModal__Body--open")) return;
      e.preventDefault();
      const idx = appState.cartItem ?? -1;
      if (idx >= 0 && idx < added.length) {
        setAppState((prev) => ({
          ...prev,
          added: added.filter((_, i) => i !== idx),
          cartItem: Math.max(0, idx - 1),
        }));
      }
    });

    // Esc - Close any open modal or clear search
    Mousetrap.bind("escape", (e) => {
      e.preventDefault();
      if (quantityModalOpen) {
        setQuantityModalOpen(false);
      } else if (priceModalOpen) {
        setPriceModalOpen(false);
      } else if (modal) {
        setModal(false);
        setVariants([]);
      } else {
        // Clear search field
        reset({ q: "", quantity: 1 });
        searchField.current?.focus();
      }
    });

    return () => {
      Mousetrap.unbind(["f1", "f2", "f3", "f12", "del", "escape"]);
    };
  }, [getSelectedCartItem, added, appState.cartItem, quantityModalOpen, priceModalOpen, modal]);

  const handleQuantityConfirm = useCallback((newQuantity: number) => {
    if (!selectedCartItem) return;
    const idx = added.findIndex(
      (a) => a.item.id === selectedCartItem.item.id && a.variant === selectedCartItem.variant
    );
    if (idx !== -1) {
      const newAdded = [...added];
      newAdded[idx] = { ...newAdded[idx], quantity: newQuantity };
      setAppState((prev) => ({ ...prev, added: newAdded }));
    }
    setQuantityModalOpen(false);
    setSelectedCartItem(null);
  }, [selectedCartItem, added, setAppState]);

  const handlePriceConfirm = useCallback((newPrice: number) => {
    if (!selectedCartItem) return;
    const idx = added.findIndex(
      (a) => a.item.id === selectedCartItem.item.id && a.variant === selectedCartItem.variant
    );
    if (idx !== -1) {
      const newAdded = [...added];
      newAdded[idx] = { ...newAdded[idx], price: newPrice };
      setAppState((prev) => ({ ...prev, added: newAdded }));
    }
    setPriceModalOpen(false);
    setSelectedCartItem(null);
  }, [selectedCartItem, added, setAppState]);

  const refundOrder = async (order: Order) => {
    const items: CartItem[] = [];
    order.items.forEach((item) => {
      items.push({
        quantity: -1 * item.quantity,
        price: item.price,
        discount: 0,
        variant: item.variant,
        item: item.product,
        taxes: item.taxes,
        taxIncluded: true,
      });
    });

    setAppState((prev) => ({
      ...prev,
      added: items,
      discount: order.discount?.type,
      tax: order.tax?.type,
      discountAmount: order.discount?.amount,
      customer: order?.customer,
      refundingFrom: Number(order.id),
    }));
  };

  const reOrder = async (order: Order) => {
    const items: CartItem[] = [];
    order.items.forEach((item) => {
      items.push({
        quantity: item.quantity,
        price: item.price,
        discount: 0,
        variant: item.variant,
        item: item.product,
        taxes: item.taxes,
        taxIncluded: true,
      });
    });

    setAppState((prev) => ({
      ...prev,
      added: items,
      discount: order.discount?.type,
      tax: order.tax?.type,
      discountAmount: order.discount?.amount,
      customer: order?.customer,
    }));
  };

  return (
    <>
      <TrapFocus inputRef={searchField.current}>
        <div className="flex flex-col">
          <div className="pos-topbar">
            <div className="pos-topbar-search">
              <form
                className="flex gap-2 flex-1"
                onSubmit={handleSubmit(searchAction)}>
                <div className="input-group flex-1">
                  <Tooltip title={t("Barcode search")}>
                    <Button
                      variant="primary"
                      className="btn-square"
                      type="button"
                      active={mode === SearchModes.sale}
                      size="lg"
                      onClick={() => setMode(SearchModes.sale)}>
                      <FontAwesomeIcon icon={faBarcode}/>
                    </Button>
                  </Tooltip>
                  <Controller
                    render={({ field }) => (
                      <Input
                        placeholder={t("Scan barcode or search by name")}
                        ref={searchField}
                        autoFocus
                        type="search"
                        className="search-field mousetrap lg flex-1"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                    name="q"
                    control={control}
                    rules={{ required: true }}
                    defaultValue=""
                  />
                  <Controller
                    render={({ field }) => (
                      <Input
                        type="number"
                        placeholder={t("Quantity")}
                        className="w-20 mousetrap lg"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                    name="quantity"
                    control={control}
                    defaultValue={1}
                    rules={{ required: true }}
                  />
                </div>
                <button className="hidden">submit</button>
              </form>
              <div className="input-group">
                <SaleFind
                  icon={faReply}
                  title={t("Refund")}
                  variant="danger"
                  onSuccess={refundOrder}
                  onError={() => {
                    notify({
                      title: t("Not found"),
                      description: t("Order not found"),
                      type: "error",
                      placement: "top",
                    });
                  }}
                  displayLabel
                />
                <SaleFind
                  icon={faRotateRight}
                  title={t("Re Order")}
                  variant="success"
                  onSuccess={reOrder}
                  onError={() => {
                    notify({
                      title: t("Not found"),
                      description: t("Order not found"),
                      type: "error",
                      placement: "top",
                    });
                  }}
                  displayLabel
                />
              </div>
              {customerBox && (
                <Input
                  placeholder={t("Enter customer name")}
                  className="lg mousetrap"
                  onChange={(event) => {
                    setAppState(prev => ({
                      ...prev,
                      customerName: event.target.value
                    }))
                  }}
                  value={customerName}
                />
              )}
            </div>
            <div className="pos-topbar-actions">
              <TopbarRight/>
            </div>
          </div>
          <div className="pos-2col-layout">
            {/* ─── Left: Categories + Products ─── */}
            <div className="pos-left-col">
              <ProductGrid
                items={items}
                addItem={addItem}
                categories={categories}
                setCategories={setCategories}
              />
            </div>

            {/* ─── Right: Cart + Payment ─── */}
            <div className="pos-right-col">
              <div className="pos-cart-panel">
                <div className="pos-cart-panel__header">
                  <CartControls containerRef={containerRef.current}/>
                </div>
                <div className="pos-cart-panel__body" ref={containerRef}>
                  <CartContainer/>
                </div>
                <div className="pos-panel-footer">
                  <Footer/>
                </div>
                <div className="pos-cart-panel__payment">
                  <CloseSaleInline
                    paymentTypesList={paymentTypesList.list}
                    isInline={true}
                  />
                </div>
              </div>
            </div>

            {/* ─── Bottom: Shortcut Bar ─── */}
            <div className="pos-shortcut-bar">
              <div className="pos-shortcut-key" title="F1">
                <span className="pos-shortcut-key__badge">F1</span>
                <span className="pos-shortcut-key__label">{t("Quantity")}</span>
              </div>
              <div className="pos-shortcut-key" title="F2">
                <span className="pos-shortcut-key__badge">F2</span>
                <span className="pos-shortcut-key__label">{t("Price")}</span>
              </div>
              <div className="pos-shortcut-key" title="F3">
                <span className="pos-shortcut-key__badge">F3</span>
                <span className="pos-shortcut-key__label">{t("Search")}</span>
              </div>
              <div className="pos-shortcut-key" title="F4">
                <span className="pos-shortcut-key__badge">F4</span>
                <span className="pos-shortcut-key__label">{t("Hold")}</span>
              </div>
              <div className="pos-shortcut-key" title="F8">
                <span className="pos-shortcut-key__badge">F8</span>
                <span className="pos-shortcut-key__label">{t("Returns")}</span>
              </div>
              <div className="pos-shortcut-key" title="F9">
                <span className="pos-shortcut-key__badge">F9</span>
                <span className="pos-shortcut-key__label">{t("Discount")}</span>
              </div>
              <div className="pos-shortcut-key" title="F12">
                <span className="pos-shortcut-key__badge">F12</span>
                <span className="pos-shortcut-key__label">{t("Pay")}</span>
              </div>
              <div className="pos-shortcut-key" title="Del">
                <span className="pos-shortcut-key__badge">Del</span>
                <span className="pos-shortcut-key__label">{t("Remove")}</span>
              </div>
              <div className="pos-shortcut-key" title="Esc">
                <span className="pos-shortcut-key__badge">Esc</span>
                <span className="pos-shortcut-key__label">{t("Cancel")}</span>
              </div>
            </div>
          </div>
        </div>
      </TrapFocus>
      <SearchVariants
        modal={modal}
        onClose={() => {
          setModal(false);
          setVariants([]);
        }}
        variants={variants}
        addItemVariant={addItemVariant}
        items={items}
      />
      <QuantityChangeModal
        open={quantityModalOpen}
        cartItem={selectedCartItem}
        onClose={() => { setQuantityModalOpen(false); setSelectedCartItem(null); }}
        onConfirm={handleQuantityConfirm}
      />
      <PriceChangeModal
        open={priceModalOpen}
        cartItem={selectedCartItem}
        onClose={() => { setPriceModalOpen(false); setSelectedCartItem(null); }}
        onConfirm={handlePriceConfirm}
      />
    </>
  );
};
