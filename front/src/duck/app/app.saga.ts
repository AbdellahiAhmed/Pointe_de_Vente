import { call, put, takeEvery } from 'redux-saga/effects';
import { bootstrap as bootstrapAction, bootstrapDone, bootstrapError } from './app.action';
import { authenticateUser } from '../auth/auth.saga';


export function* bootstrap() {
  try {
    yield call(authenticateUser);
  } catch (exception) {
    // Never block the app — always proceed to login
    console.warn('Bootstrap auth failed, proceeding to login:', exception);
  }

  yield put(bootstrapDone({ hasBootstrapped: true }));
}

export function* appSaga() {
  yield takeEvery(bootstrapAction.toString(), bootstrap);
}