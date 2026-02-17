import {createAction} from 'redux-actions';

export const storeAction = createAction(
  'STORE_ACTION',
  (payload: any) => payload
);
