/**
 * Server / UI / temporary state separation — architecture layer.
 */

type Listener = () => void;

export type ServerStateSlice = {
  readonly hydrated: boolean;
  readonly lastSyncedAt: string | null;
  readonly online: boolean;
};

export type UiStateSlice = {
  readonly sidebarCollapsed: boolean;
  readonly activeModalId: string | null;
  readonly commandPaletteOpen: boolean;
};

export type TemporaryStateSlice = {
  readonly draftByKey: Readonly<Record<string, string>>;
  readonly flashMessage: string | null;
};

const serverListeners = new Set<Listener>();
const uiListeners = new Set<Listener>();
const tempListeners = new Set<Listener>();

let serverState: ServerStateSlice = {
  hydrated: false,
  lastSyncedAt: null,
  online: true,
};

let uiState: UiStateSlice = {
  sidebarCollapsed: false,
  activeModalId: null,
  commandPaletteOpen: false,
};

let temporaryState: TemporaryStateSlice = {
  draftByKey: {},
  flashMessage: null,
};

function emit(set: Set<Listener>): void {
  set.forEach((l) => l());
}

export const serverStateStore = {
  subscribe(listener: Listener): () => void {
    serverListeners.add(listener);
    return () => serverListeners.delete(listener);
  },
  get(): ServerStateSlice {
    return serverState;
  },
  patch(partial: Partial<ServerStateSlice>): void {
    serverState = { ...serverState, ...partial };
    emit(serverListeners);
  },
};

export const uiStateStore = {
  subscribe(listener: Listener): () => void {
    uiListeners.add(listener);
    return () => uiListeners.delete(listener);
  },
  get(): UiStateSlice {
    return uiState;
  },
  patch(partial: Partial<UiStateSlice>): void {
    uiState = { ...uiState, ...partial };
    emit(uiListeners);
  },
};

export const temporaryStateStore = {
  subscribe(listener: Listener): () => void {
    tempListeners.add(listener);
    return () => tempListeners.delete(listener);
  },
  get(): TemporaryStateSlice {
    return temporaryState;
  },
  setDraft(key: string, value: string): void {
    temporaryState = {
      ...temporaryState,
      draftByKey: { ...temporaryState.draftByKey, [key]: value },
    };
    emit(tempListeners);
  },
  clearDraft(key: string): void {
    const next = { ...temporaryState.draftByKey };
    delete next[key];
    temporaryState = { ...temporaryState, draftByKey: next };
    emit(tempListeners);
  },
  setFlash(message: string | null): void {
    temporaryState = { ...temporaryState, flashMessage: message };
    emit(tempListeners);
  },
};
