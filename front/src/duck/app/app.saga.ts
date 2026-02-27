import { call, put, takeEvery } from 'redux-saga/effects';
import { bootstrap as bootstrapAction, bootstrapDone, setNeedsSetup } from './app.action';
import { authenticateUser } from '../auth/auth.saga';
import { SETUP_STATUS } from '../../api/routing/routes/backend.app';
import { jsonRequest } from '../../api/request/request';


export function* bootstrap() {
  try {
    // Check if the system needs initial setup
    const statusRes: Response = yield call(jsonRequest, SETUP_STATUS);
    const statusData: { needsSetup: boolean } = yield call([statusRes, 'json']);

    if (statusData.needsSetup) {
      yield put(setNeedsSetup(true));
      yield put(bootstrapDone({ hasBootstrapped: true }));
      return;
    }

    yield put(setNeedsSetup(false));
  } catch (e) {
    // If setup check fails, default to no setup needed
    yield put(setNeedsSetup(false));
  }

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
