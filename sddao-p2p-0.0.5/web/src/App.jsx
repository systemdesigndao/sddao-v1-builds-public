import './wasm_exec.js';
import { useEffect, useRef, useCallback } from 'react';
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
import useStore from './store';
import { 
  Header, 
  ConnectionPanel, 
  KeysPanel, 
  NetworkPanel, 
  ChatPanel 
} from './components';

const CHAT_PROTOCOL = '/libp2p/sddao/chat/1.0.0';

let persistentStream = null; // Global persistent stream
let isListening = false; // Global listening state
let globalNode = null; // Global node reference
let isConnected = false; // Global connection state
let currentRelayAddr = null; // Global relay address
let isConnecting = false; // Global connecting flag
let renderedNode = false;
let renderedWasm = false;

const startAutoListening = async (appendOutput) => {
  if (!isConnected || !currentRelayAddr) {
    return;
  }
  
  try {
    appendOutput('🎧 Starting auto-listening...');
    
    // Open a persistent stream to the TON Bridge using the chat protocol
    persistentStream = await globalNode.dialProtocol(currentRelayAddr, CHAT_PROTOCOL, {
      signal: AbortSignal.timeout(10000)
    });
    
    isListening = true;
    
    appendOutput('✅ Auto-listening started! Waiting for messages...');
    
    // Read messages in a loop without closing the stream
    const reader = byteStream(persistentStream);
    
    while (isListening && isConnected && persistentStream) {
      try {
        const response = await reader.read();
        if (!response) {
          // No data but stream might still be active, continue
          continue;
        }
        
        const responseText = toString(response.subarray());
        
        appendOutput(`${responseText.trim()}`);
      } catch (readErr) {
        if (readErr.message !== 'stream ended' && isListening) {
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
    
    // If we get here, the stream ended - try to restart it
    if (isListening && isConnected) {
      appendOutput('🔄 Stream ended, attempting to restart...');
      // Reset the stream reference
      persistentStream = null;
      
      // Try to restart the stream
      setTimeout(() => {
        if (isListening && isConnected && globalNode) {
          appendOutput('🔄 Restarting auto-listening...');
          startAutoListening(appendOutput);
        }
      }, 1000);
    }
    
  } catch (err) {
    appendOutput(`❌ Auto-listening failed: ${err.message}`);
    isListening = false;
  }
};

// Connect to TON Bridge
const connectToBridge = async (ma, appendOutput) => {
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
    isConnecting = true;
    appendOutput(`🔗 Connecting to '${ma}'`);
    
    const signal = AbortSignal.timeout(10000);
    await globalNode.dial(ma, { signal });
    
    appendOutput('✅ Connected to TON Bridge');
    isConnected = true;
    currentRelayAddr = ma;
    
    // Add circuit relay address to listening addresses
    addCircuitRelayAddress(globalNode, appendOutput);
    
    // Start auto-listening automatically
    startAutoListening(appendOutput);
    
  } catch (err) {
    appendOutput(`❌ Connection failed: ${err.message}`);
    throw err;
  } finally {
    isConnecting = false;
  }
};

// Function to create circuit relay address
const createCircuitRelayAddress = (node) => {
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
};

// Function to add circuit relay address to listening addresses
const addCircuitRelayAddress = (node, appendOutput) => {
  const circuitAddr = createCircuitRelayAddress(node);
  appendOutput(`🔗 Your libp2p address: ${circuitAddr}`);
  
  // Get current listening addresses
  const currentAddresses = node.getMultiaddrs();
  
  // Create list with circuit relay address
  const allAddresses = [...currentAddresses, multiaddr(circuitAddr)];
  
  // Update store with all addresses
  const { setMultiaddrs } = useStore.getState();
  setMultiaddrs(allAddresses.map((ma) => ma.toString()));
  
  appendOutput(`✅ Added circuit relay address to listening addresses`);
};

const App = () => {
  const {
    setOutput,
    setStatus,
    setConnections,
    setMultiaddrs,
    setIsConnectedState,
  } = useStore();

  const internalConnectionRef = useRef(null);

  const appendOutput = useCallback((line) => {
    try {
      const query = JSON.parse(line);
      if (query.type === 'welcome') {
        appendOutput(`🌐 ${query.message} (ID: ${query.libp2p_pub_key})`);
        return;
      }
      if (query.type === 'ton_message') {
        const messageData = {
          text: query.message,
          isSystemMessage: false,
          isUserMessage: false,
          isAnotherUserMessage: true,
          timestamp: Date.now()
        };
        
        setOutput(prev => [...prev, messageData]);
        return;
      }
    } catch (err) {}
    
    const messageData = {
      text: line,
      isSystemMessage: false,
      isUserMessage: false,
      isAnotherUserMessage: false,
      timestamp: Date.now()
    };
    
    setOutput(prev => [...prev, messageData]);
  }, []);

  const generateKeysWrapper = async () => {
    try {
      appendOutput('🔑 Generating new Ed25519 key pair...');
      const result = window.generateKeys();
      if (result && result.success) {
        const { setPublicKey, setPrivateKey } = useStore.getState();
        setPublicKey(result.publicKey);
        setPrivateKey(result.privateKey);
        appendOutput('✅ Keys generated successfully!');
        
        // Automatically send command=start if connected
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
  };

  const connect = useCallback(async () => {
    if (!globalNode) {
      appendOutput('❌ Node not initialized yet, please wait...');
      return;
    }

    if (isConnected) {
      appendOutput('Already connected');
      return;
    }

    try {
      const { peer } = useStore.getState();
      const ma = multiaddr(peer);
      await connectToBridge(ma, appendOutput);
      setIsConnectedState(true);
      setStatus('connected');
      
    } catch (err) {
      appendOutput(`❌ Connection failed: ${err.message}`);
      setStatus('disconnected');
    }
  }, [appendOutput, setIsConnectedState, setStatus]);

  const sendMessageToGo = useCallback(async () => {
    if (!globalNode || !isConnected) {
      appendOutput('❌ Not connected');
      return;
    }
    
    const { message, setMessage } = useStore.getState();
    if (!message.trim()) {
      return; // Don't send empty messages
    }
    
    let messageToSend = message;
    if (internalConnectionRef.current) {
      messageToSend = 'message=' + internalConnectionRef.current.split('=')[1] + ':' + messageToSend;
    }

    if (messageToSend.includes('connect=')) {
      internalConnectionRef.current = messageToSend;
    }

    try {
      // Create a new stream for each message (like in original Vanilla implementation)
      // Vanilla implementation is internal basic PoC app
      // Implementation of stream protocol should be improved also
      const stream = await globalNode.dialProtocol(currentRelayAddr, CHAT_PROTOCOL);
      
      // Send message using new stream
      const messageBytes = fromString(messageToSend + '\n');
      await stream.sink([messageBytes]);
      appendOutput(`Sending message to TON Bridge: '${messageToSend}'`);
      setMessage('');
      
      appendOutput(`✅ Command sent to TON Bridge successfully!`);
      
    } catch (err) {
      appendOutput(`❌ Failed to send message: ${err.message}`);
    }
  }, [appendOutput]);

  // Handle Enter key press
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessageToGo();
    }
  }, [sendMessageToGo]);


  // Initialize libp2p node in useEffect
  useEffect(() => {
    const initializeNode = async () => {
      if (globalNode || renderedNode) return; // Already initialized
      renderedNode = true;
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
            const circuitAddr = createCircuitRelayAddress(node);
            allAddresses.push(multiaddr(circuitAddr));
          }
          
          setMultiaddrs(allAddresses.map((ma) => ma.toString()));
        });

        await node.start();
        globalNode = node;
        setMultiaddrs(node.getMultiaddrs().map((ma) => ma.toString()));
        
        appendOutput('✅ libp2p node initialized successfully');
        
      } catch (err) {
        appendOutput(`❌ Failed to initialize libp2p node: ${err.message}`);
      }
    };

    initializeNode();
  }, [appendOutput]);

  useEffect(() => {
    if (renderedWasm) return;
    renderedWasm = true;
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
  }, [appendOutput]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header onGenerateKeys={generateKeysWrapper} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <ConnectionPanel onConnect={connect} />
            <KeysPanel />
            <NetworkPanel />
          </div>

          <div className="lg:col-span-2">
            <ChatPanel 
              onSendMessage={sendMessageToGo}
              onKeyPress={handleKeyPress}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
