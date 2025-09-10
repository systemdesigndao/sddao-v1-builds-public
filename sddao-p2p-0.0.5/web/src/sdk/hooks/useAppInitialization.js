import { useTonP2PBridge } from './useTonP2PBridge';
import { useLibP2PInitialization } from './useLibP2PInitialization';
import { useWasmInitialization } from './useWasmInitialization';

// Hook for complete app initialization
export const useAppInitialization = () => {
  const { appendOutput } = useTonP2PBridge();
  
  useLibP2PInitialization(appendOutput);
  useWasmInitialization();
};
