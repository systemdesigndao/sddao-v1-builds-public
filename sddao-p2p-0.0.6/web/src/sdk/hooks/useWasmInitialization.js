import { useEffect } from 'react';
import useStore from '@/store';
import { keyManager } from '@/sdk';

// Hook for initializing WASM
export const useWasmInitialization = () => {
  useEffect(() => {
    const { renderedWasm } = useStore.getState();
    if (renderedWasm) return;
    
    keyManager.initializeWasm();
  }, []);
};
