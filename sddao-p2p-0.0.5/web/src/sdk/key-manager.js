import { fromString } from 'uint8arrays';
import useStore from '@/store';
import { CHAT_PROTOCOL } from '@/constants';

class KeyManager {
  constructor() {}

  // Generate new Ed25519 key pair
  async generateKeys(appendOutput) {
    try {
      appendOutput('🔑 Generating new Ed25519 key pair...');
      const result = window.generateKeys();
      if (result && result.success) {
        const { setPublicKey, setPrivateKey } = useStore.getState();
        setPublicKey(result.publicKey);
        setPrivateKey(result.privateKey);
        appendOutput('✅ Keys generated successfully!');
        
        // Automatically send command=start if connected
        const { isConnected, globalNode, currentRelayAddr } = useStore.getState();
        if (isConnected && globalNode) {
          appendOutput('🚀 Automatically sending command=start...');
          try {
            const startCommand = `command=start&priv_key=${result.privateKey}&pub_key=${result.publicKey}`;
            const stream = await globalNode.dialProtocol(currentRelayAddr, CHAT_PROTOCOL);
            const commandBytes = fromString(startCommand + '\n');
            await stream.sink([commandBytes]);
            appendOutput('✅ Command=start sent successfully');
          } catch (err) {
            appendOutput(`❌ Failed to send command=start: ${err.message}`);
          }
        }
      } else {
        appendOutput(`❌ Failed to generate keys: ${result ? result.error : 'No result from WASM'}`);
      }
    } catch (err) {
      appendOutput(`❌ Error generating keys: ${err.message}`);
    }
  }

  // Initialize WASM
  async initializeWasm() {
    const { renderedWasm, setRenderedWasm } = useStore.getState();
    
    if (renderedWasm) return;
    setRenderedWasm(true);
    
    const go = new Go();
    WebAssembly.instantiateStreaming(fetch('/keys.wasm'), go.importObject).then((result) => {
      go.run(result.instance);
      console.info('WASM initialized successfully');
      if (window.generateKeys) {
        console.info('WASM generateKeys function is available');
      } else {
        console.info('WASM generateKeys function not found');
      }
    }).catch((err) => {
      console.error(`Failed to initialize WASM: ${err}`);
    });
  }
}

export default KeyManager;
