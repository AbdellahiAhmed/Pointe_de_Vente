import {Category} from "./category";
import {ProductVariant} from "./product.variant";
import {ProductPrice} from "./product.price";
import {Brand} from "./brand";
import {Supplier} from "./supplier";
import {Store} from "./store";
import {Department} from "./department";
import {Terminal} from "./terminal";
import {Tax} from "./tax";
import {HydraId, HydraType} from "./hydra";
import { ProductStore } from "./product.store";

export interface ProductMedia {
  id: number;
  originalName: string;
  name: string;
  extension?: string;
  mimeType?: string;
}

export interface Product extends HydraId, HydraType{
  id: number;
  name: string;
  sku?: string;
  barcode?: string;
  reference?: string;
  baseQuantity?: number;
  isAvailable?: boolean;
  quantity?: number;
  basePrice: number;
  minPrice?: number;
  categories: Category[];
  variants: ProductVariant[];
  prices: ProductPrice[];
  isActive: boolean;
  uuid?: string;
  purchaseUnit?: string;
  saleUnit?: string;
  cost?: number;
  brands: Brand[];
  suppliers: Supplier[];
  stores: ProductStore[];
  department?: Department;
  terminals: Terminal[];
  taxes: Tax[];
  manageInventory?: boolean;
  media?: ProductMedia;
}

export interface SearchableProduct {
  isVariant?: boolean;
  variant?: ProductVariant;
  item: Product
}
