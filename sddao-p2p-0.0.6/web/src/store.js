import { create } from "zustand";

const useStore = create((set) => ({
  // ==== output ====
  output: [],
  setOutput: (updater) =>
    set((state) => ({
      output:
        typeof updater === "function" ? updater(state.output) : updater,
    })),

  // ==== status ====
  status: "waiting",
  setStatus: (status) => set({ status }),

  // ==== peer ====
  peer: "",
  setPeer: (peer) => set({ peer }),

  // ==== keys ====
  publicKey: "",
  setPublicKey: (publicKey) => set({ publicKey }),

  privateKey: "",
  setPrivateKey: (privateKey) => set({ privateKey }),

  // ==== connections ====
  connections: [],
  setConnections: (updater) =>
    set((state) => ({
      connections:
        typeof updater === "function" ? updater(state.connections) : updater,
    })),

  // ==== multiaddrs ====
  multiaddrs: [],
  setMultiaddrs: (updater) =>
    set((state) => ({
      multiaddrs:
        typeof updater === "function" ? updater(state.multiaddrs) : updater,
    })),

  // ==== message ====
  message: "",
  setMessage: (message) => set({ message }),

  // ==== toggles ====
  showPublicKey: false,
  setShowPublicKey: (val) => set({ showPublicKey: val }),

  showPrivateKey: false,
  setShowPrivateKey: (val) => set({ showPrivateKey: val }),

  // ==== connection state ====
  isConnectedState: false,
  setIsConnectedState: (val) => set({ isConnectedState: val }),

  // ==== global state ====
  persistentStream: null,
  setPersistentStream: (stream) => set({ persistentStream: stream }),

  isListening: false,
  setIsListening: (val) => set({ isListening: val }),

  globalNode: null,
  setGlobalNode: (node) => set({ globalNode: node }),

  isConnected: false,
  setIsConnected: (val) => set({ isConnected: val }),

  currentRelayAddr: null,
  setCurrentRelayAddr: (addr) => set({ currentRelayAddr: addr }),

  isConnecting: false,
  setIsConnecting: (val) => set({ isConnecting: val }),

  renderedNode: false,
  setRenderedNode: (val) => set({ renderedNode: val }),

  renderedWasm: false,
  setRenderedWasm: (val) => set({ renderedWasm: val }),
}));

export default useStore;
