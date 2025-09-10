import { noise } from '@chainsafe/libp2p-noise';
import { yamux } from '@chainsafe/libp2p-yamux';
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2';
import { identify, identifyPush } from '@libp2p/identify';
import { webSockets } from '@libp2p/websockets';
import * as filters from '@libp2p/websockets/filters';
import { multiaddr } from '@multiformats/multiaddr';
import { byteStream } from 'it-byte-stream';
import { createLibp2p } from 'libp2p';
import { fromString, toString } from 'uint8arrays';
import useStore from '@/store';
import { CHAT_PROTOCOL } from '@/constants';

class LibP2PManager {
  constructor() {}

  // Initialize libp2p node
  async initializeNode(appendOutput) {
    const { globalNode, setGlobalNode, renderedNode, setRenderedNode } = useStore.getState();
    
    if (globalNode || renderedNode) return; // Already initialized
    setRenderedNode(true);
    
    try {
      appendOutput('🔄 Initializing libp2p node...');
      
      const node = await createLibp2p({
        addresses: {
          listen: [
            '/p2p-circuit',
          ]
        },
        transports: [
          webSockets({
            filter: filters.all
          }),
          circuitRelayTransport()
        ],
        connectionEncrypters: [noise()],
        streamMuxers: [yamux()],
        connectionGater: {
          denyDialMultiaddr: () => false
        },
        services: {
          identify: identify(),
          identifyPush: identifyPush()
        }
      });

      // Set up event listeners
      this.setupEventListeners(node, appendOutput);

      await node.start();
      setGlobalNode(node);
      
      const { setMultiaddrs } = useStore.getState();
      setMultiaddrs(node.getMultiaddrs().map((ma) => ma.toString()));
      
      appendOutput('✅ libp2p node initialized successfully');
      
    } catch (err) {
      appendOutput(`❌ Failed to initialize libp2p node: ${err.message}`);
    }
  }

  // Set up event listeners for the node
  setupEventListeners(node, appendOutput) {
    const { setConnections, setIsConnectedState, setMultiaddrs } = useStore.getState();

    node.addEventListener('connection:open', (evt) => {
      appendOutput(`✅ Connected to ${evt.detail.remoteAddr.toString()}`);
      setConnections(node.getConnections().map(c => c.remoteAddr.toString()));
      setIsConnectedState(true);
    });

    node.addEventListener('connection:close', () => {
      appendOutput('Connection closed');
      setConnections(node.getConnections().map(c => c.remoteAddr.toString()));
      setIsConnectedState(false);
    });

    node.addEventListener('self:peer:update', () => {
      // Update multiaddrs list, show circuit relay address
      const currentAddresses = node.getMultiaddrs();
      
      // Check if we have any relay connections to add circuit relay address
      const hasRelayConnection = node.getConnections().some(conn => 
        conn.remoteAddr.toString().includes('/p2p/')
      );
      
      let allAddresses = [...currentAddresses];
      
      if (hasRelayConnection) {
        const circuitAddr = this.createCircuitRelayAddress(node);
        allAddresses.push(multiaddr(circuitAddr));
      }
      
      setMultiaddrs(allAddresses.map((ma) => ma.toString()));
    });
  }

  // Connect to TON Bridge
  async connectToBridge(ma, appendOutput) {
    const { 
      isConnecting, 
      setIsConnecting, 
      isConnected, 
      setIsConnected, 
      globalNode, 
      setCurrentRelayAddr 
    } = useStore.getState();

    // Prevent double connection
    if (isConnecting) {
      appendOutput(`⚠️ Connection already in progress, please wait...`);
      return;
    }
    
    if (isConnected) {
      appendOutput(`ℹ️ Already connected to TON Bridge`);
      return;
    }
    
    try {
      setIsConnecting(true);
      appendOutput(`🔗 Connecting to '${ma}'`);
      
      const signal = AbortSignal.timeout(10000);
      await globalNode.dial(ma, { signal });
      
      appendOutput('✅ Connected to TON Bridge');
      setIsConnected(true);
      setCurrentRelayAddr(ma);
      
      // Add circuit relay address to listening addresses
      this.addCircuitRelayAddress(globalNode, appendOutput);
      
      // Start auto-listening automatically
      this.startAutoListening(appendOutput);
      
    } catch (err) {
      appendOutput(`❌ Connection failed: ${err.message}`);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }

  // Start auto-listening for messages
  async startAutoListening(appendOutput) {
    const { 
      isConnected, 
      currentRelayAddr, 
      globalNode, 
      setIsListening, 
      setPersistentStream 
    } = useStore.getState();

    if (!isConnected || !currentRelayAddr) {
      return;
    }
    
    try {
      appendOutput('🎧 Starting auto-listening...');
      
      // Open a persistent stream to the TON Bridge using the chat protocol
      const persistentStream = await globalNode.dialProtocol(currentRelayAddr, CHAT_PROTOCOL, {
        signal: AbortSignal.timeout(10000)
      });
      
      setIsListening(true);
      setPersistentStream(persistentStream);
      
      appendOutput('✅ Auto-listening started! Waiting for messages...');
      
      // Read messages in a loop without closing the stream
      const reader = byteStream(persistentStream);
      
      while (useStore.getState().isListening && useStore.getState().isConnected && persistentStream) {
        try {
          const response = await reader.read();
          if (!response) {
            // No data but stream might still be active, continue
            continue;
          }
          
          const responseText = toString(response.subarray());
          
          appendOutput(`${responseText.trim()}`);
        } catch (readErr) {
          if (readErr.message !== 'stream ended' && useStore.getState().isListening) {
            appendOutput(`⚠️ Stream error: ${readErr.message}`);
            // Don't break the loop, just continue reading
            continue;
          }
          // Only break if stream actually ended
          if (readErr.message === 'stream ended') {
            appendOutput('⚠️ Stream ended, will attempt to restart');
            break;
          }
          // For other errors, continue reading
          continue;
        }
      }    
    } catch (err) {
      appendOutput(`❌ Auto-listening failed: ${err.message}`);
      setIsListening(false);
    }
  }

  // Create circuit relay address
  createCircuitRelayAddress(node) {
    const peerId = node.peerId.toString();
    
    // Get the relay connection to build the full circuit relay address
    const relayConnections = node.getConnections().filter(conn => 
      conn.remoteAddr.toString().includes('/p2p/')
    );
    
    if (relayConnections.length > 0) {
      const relayAddr = relayConnections[0].remoteAddr;
      
      // Create full circuit relay address: relay_address/p2p-circuit/p2p/client_peer_id
      return `${relayAddr.toString()}/p2p-circuit/p2p/${peerId}`;
    }
    
    // Fallback to simple circuit relay address
    return `/p2p-circuit/p2p/${peerId}`;
  }

  // Add circuit relay address to listening addresses
  addCircuitRelayAddress(node, appendOutput) {
    const circuitAddr = this.createCircuitRelayAddress(node);
    appendOutput(`🔗 Your libp2p address: ${circuitAddr}`);
    
    // Get current listening addresses
    const currentAddresses = node.getMultiaddrs();
    
    // Create list with circuit relay address
    const allAddresses = [...currentAddresses, multiaddr(circuitAddr)];
    
    // Update store with all addresses
    const { setMultiaddrs } = useStore.getState();
    setMultiaddrs(allAddresses.map((ma) => ma.toString()));
    
    appendOutput(`✅ Added circuit relay address to listening addresses`);
  }

  // Send message to TON Bridge
  async sendMessage(message, appendOutput) {
    const { globalNode, isConnected, currentRelayAddr } = useStore.getState();
    
    if (!globalNode || !isConnected) {
      appendOutput('❌ Not connected');
      return;
    }
    
    if (!message.trim()) {
      return; // Don't send empty messages
    }
    
    try {
      // Create a new stream for each message
      const stream = await globalNode.dialProtocol(currentRelayAddr, CHAT_PROTOCOL);
      
      // Send message using new stream
      const messageBytes = fromString(message + '\n');
      await stream.sink([messageBytes]);
      appendOutput(`Sending message to TON Bridge: '${message}'`);
      
      appendOutput(`✅ Command sent to TON Bridge successfully!`);
      
    } catch (err) {
      appendOutput(`❌ Failed to send message: ${err.message}`);
    }
  }
}

export default LibP2PManager;
