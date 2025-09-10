import { useEffect } from 'react';
import useStore from '@/store';
import { libp2pManager } from '@/sdk';

// Hook for initializing libp2p node
export const useLibP2PInitialization = (appendOutput) => {
  useEffect(() => {
    const { globalNode, renderedNode } = useStore.getState();
    if (globalNode || renderedNode) return; // Already initialized
    
    libp2pManager.initializeNode(appendOutput);
  }, [appendOutput]);
};
