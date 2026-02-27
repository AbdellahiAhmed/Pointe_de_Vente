export interface AppState {
  hasBootstrapped: boolean;
  needsSetup: boolean;
  error?: Error
}

export const INITIAL_STATE: AppState = {
  hasBootstrapped: false,
  needsSetup: false,
};
