import { call, put } from 'redux-saga/effects';
import { logoutError, userAuthenticated, userAuthenticationFailed, userLoggedOut } from './auth.action';
import { AuthInfoResponse, getAuthInfo, UserNotAuthorizedException } from '../../api/api/account/info';
import { User } from "../../api/model/user";
import {jsonRequest} from "../../api/request/request";
import {LOGOUT} from "../../api/routing/routes/backend.app";
import {storeAction} from "../store/store.action";
import Cookies from "js-cookie";
import {terminalAction} from "../terminal/terminal.action";

export async function authLogout(): Promise<void> {
  await jsonRequest(LOGOUT, { method: 'post' });
  return;
}

export function* authenticateUser() {
  let response: AuthInfoResponse;

  try {
    response = yield call(getAuthInfo);
  } catch (exception) {
    // Any auth error (401, 500, network) → show login page
    yield put(userAuthenticationFailed(exception));
    return;
  }

  yield put(
    userAuthenticated(response.user as User)
  );

  const storeCookie = Cookies.get('store');
  if (storeCookie) {
    try {
      yield put(storeAction(JSON.parse(storeCookie)));
    } catch (e) {
      // Invalid store cookie, ignore
    }
  }

  const terminalCookie = Cookies.get('terminal');
  if (terminalCookie) {
    try {
      yield put(terminalAction(JSON.parse(terminalCookie)));
    } catch (e) {
      // Invalid terminal cookie, ignore
    }
  }
}

export function* logout() {
  try {
    yield call(authLogout);
  } catch (exception) {
    yield put(logoutError(exception));
    return;
  }

  yield put(userLoggedOut());
}
