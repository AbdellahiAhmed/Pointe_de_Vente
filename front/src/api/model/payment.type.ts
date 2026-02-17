import {Store} from "./store";
import {HydraId, HydraType} from "./hydra";

export interface PaymentType extends HydraId, HydraType {
  id: string;
  name: string;
  type: string;
  category: 'cash' | 'mobile' | 'credit';
  canHaveChangeDue?: boolean;
  stores: Store[];
  isActive: boolean;
}
