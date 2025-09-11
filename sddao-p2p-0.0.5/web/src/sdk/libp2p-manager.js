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

      // Add protocol handler for libp2p Bridge
      node.handle(CHAT_PROTOCOL, async ({ stream }) => {
        const chatStream = byteStream(stream);

        try {
          while (true) {
            const buf = await chatStream.read();
            const message = toString(buf.subarray());
            
            console.log('📥 Received message in node.handle:', message);
            appendOutput(`📥 Received message: '${message}'`);
            
            // Try to parse JSON response
            try {
              const jsonResponse = JSON.parse(message);
              if (jsonResponse.type === 'libp2p_message') {
                appendOutput(`💬 libp2p Message: ${jsonResponse.message}`);
              } else if (jsonResponse.type === 'ready_for_messages') {
                appendOutput(`📡 ${jsonResponse.message}`);
              } else if (jsonResponse.type === 'welcome') {
                appendOutput(`🌐 ${jsonResponse.message} (ID: ${jsonResponse.client_id})`);
              }
            } catch (parseErr) {
              // Check if it's a libp2p message from peer
              if (message.includes('libp2p Message from peer:')) {
                appendOutput(`💬 ${message}`);
              } else if (message.includes('Connected to libp2p Bridge')) {
                appendOutput(`🌐 ${message}`);
              } else if (message.includes('Command response:')) {
                appendOutput(`📋 ${message}`);
              } else if (message.includes('libp2p node started')) {
                appendOutput(`📡 ${message}`);
              } else if (message.includes('success: connected via libp2p node')) {
                appendOutput(`✅ ${message}`);
              } else if (message.includes('success: message sent via libp2p node')) {
                appendOutput(`✅ ${message}`);
              } else if (message.includes('Failed to connect via') || message.includes('Failed to send message via')) {
                appendOutput(`⚠️ ${message}`);
              } else if (message.includes('peer not found by public key')) {
                appendOutput(`⚠️ ${message}`);
              } else if (message.includes('not found via mDNS discovery')) {
                appendOutput(`⚠️ ${message}`);
              } else if (message.includes('error:')) {
                appendOutput(`❌ ${message}`);
              } else if (message.includes('command=start')) {
                // Hide command=start messages from chat
                console.log('Hidden command=start message:', message);
              } else {
                // Regular message
                appendOutput(`📨 ${message}`);
              }
            }
          }
        } catch (err) {
          if (err.message !== 'stream ended') {
            appendOutput(`⚠️ Chat stream error: ${err.message}`);
          }
        }
        // Don't close the stream - let it stay open (Yamux will manage it)
        appendOutput('🔄 Yamux stream kept open for efficient multiplexing');
        appendOutput('🔄 Multiple streams can now be created over this connection');
        appendOutput('🔄 TCP connection preserved for future stream creation');
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
      
      // Determine bridge type for logging
      // TON Bridge uses port 8083, libp2p Bridge uses port 8082
      const isLibP2PBridge = currentRelayAddr.toString().includes(':8082/');
      const bridgeType = isLibP2PBridge ? 'libp2p Bridge' : 'TON Bridge';
      
      appendOutput(`✅ Auto-listening started! Waiting for messages from ${bridgeType}...`);
      
      setIsListening(true);
      
      // For libp2p Bridge, we don't need a persistent stream
      // Messages are handled by the node.handle(CHAT_PROTOCOL) in initializeNode
      if (isLibP2PBridge) {
        appendOutput('🔄 libp2p Bridge uses event-driven message handling');
        return;
      }
      
      // For TON Bridge, open a persistent stream
      const persistentStream = await globalNode.dialProtocol(currentRelayAddr, CHAT_PROTOCOL, {
        signal: AbortSignal.timeout(10000)
      });
      
      setPersistentStream(persistentStream);
      
      // Read messages in a loop for TON Bridge
      const reader = byteStream(persistentStream);
      
      while (useStore.getState().isListening && useStore.getState().isConnected && persistentStream) {
        try {
          const response = await reader.read();
          if (!response) {
            continue;
          }
          
          const responseText = toString(response.subarray());
          
          // Use message handler for TON Bridge
          const { messageHandler } = await import('./init.js');
          messageHandler.appendOutput(responseText.trim());
        } catch (readErr) {
          if (readErr.message !== 'stream ended' && useStore.getState().isListening) {
            appendOutput(`⚠️ Stream error: ${readErr.message}`);
            continue;
          }
          if (readErr.message === 'stream ended') {
            appendOutput('⚠️ Stream ended, will attempt to restart');
            break;
          }
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

  // Handle libp2p Bridge messages
  static handleLibP2PMessage(responseText, appendOutput) {
    console.log('🔍 Processing libp2p message:', responseText);
    
    // Handle different types of messages from libp2p Bridge
    if (responseText.includes('libp2p Message from peer:')) {
      console.log('✅ Found libp2p message from peer');
      appendOutput(`💬 ${responseText.trim()}`);
    } else if (responseText.includes('Connected to libp2p Bridge')) {
      console.log('✅ Found connection message');
      appendOutput(`🌐 ${responseText.trim()}`);
    } else if (responseText.includes('Command response:')) {
      console.log('✅ Found command response');
      appendOutput(`📋 ${responseText.trim()}`);
    } else if (responseText.includes('libp2p node started. Ready to receive')) {
      console.log('✅ Found node started message');
      appendOutput(`📡 ${responseText.trim()}`);
    } else if (responseText.includes('libp2p node started successfully')) {
      console.log('✅ Found node started successfully message');
      appendOutput(`📡 ${responseText.trim()}`);
    } else if (responseText.includes('"type":"command_response"')) {
      // Parse JSON response
      try {
        const responseData = JSON.parse(responseText);
        if (responseData.type === 'command_response') {
          appendOutput(`📋 Command response: ${responseData.response}`);
          
          // Check if this was a successful connect command
          if (responseData.command && responseData.command.startsWith('connect=') && 
              responseData.response && responseData.response.includes('success: connected')) {
            appendOutput('✅ Подключение установлено успешно');
          }
        }
      } catch (parseErr) {
        appendOutput(`📋 Raw response: ${responseText.trim()}`);
      }
    } else if (responseText.includes('"type":"ready_for_messages"')) {
      appendOutput(`📡 ${responseText.trim()}`);
    } else if (responseText.includes('success: connected via libp2p node')) {
      appendOutput(`✅ ${responseText.trim()}`);
    } else if (responseText.includes('success: message sent via libp2p node')) {
      appendOutput(`✅ ${responseText.trim()}`);
    } else if (responseText.includes('Failed to connect via') || responseText.includes('Failed to send message via')) {
      appendOutput(`⚠️ ${responseText.trim()}`);
      appendOutput(`💡 Tip: You need another client with a different public key to test P2P communication`);
      appendOutput(`💡 Open another browser tab and generate different keys, then use that public key to connect`);
      appendOutput(`💡 Make sure both clients are connected to the same libp2p Bridge`);
    } else if (responseText.includes('peer not found by public key')) {
      appendOutput(`⚠️ Peer not found: ${responseText.trim()}`);
      appendOutput(`💡 This is expected - you're trying to connect to yourself!`);
      appendOutput(`💡 To test P2P: open another browser tab, generate different keys, and use that public key`);
      appendOutput(`💡 Both clients must be connected to the same libp2p Bridge`);
    } else if (responseText.includes('not found via mDNS discovery')) {
      appendOutput(`⚠️ mDNS Discovery failed: ${responseText.trim()}`);
      appendOutput(`💡 This is normal in browsers - mDNS discovery has limitations`);
      appendOutput(`💡 Make sure both clients are connected to the same libp2p Bridge`);
      appendOutput(`💡 The bridge will handle peer discovery for you`);
    } else if (responseText.includes('error:')) {
      appendOutput(`❌ ${responseText.trim()}`);
    } else if (responseText.includes('command=start')) {
      // Hide command=start messages from chat
      console.log('Hidden command=start message:', responseText.trim());
    } else {
      // Log any other messages for debugging
      appendOutput(`📨 Received: ${responseText.trim()}`);
    }
  }

  // Create new stream for libp2p Bridge (Yamux multiplexing)
  async createNewStream() {
    const { globalNode, isConnected, currentRelayAddr } = useStore.getState();
    
    if (!globalNode || !isConnected) {
      throw new Error('Not connected to libp2p Bridge');
    }
    
    try {
      // Create new stream using existing connection (Yamux)
      const newStream = await globalNode.dialProtocol(currentRelayAddr, CHAT_PROTOCOL, {
        signal: AbortSignal.timeout(10000)
      });
      
      // Setup stream handler
      this.setupStreamHandler(newStream);
      
      return newStream;
    } catch (err) {
      throw new Error(`Failed to create new Yamux stream: ${err.message}`);
    }
  }

  // Setup stream handler for new streams
  setupStreamHandler(stream) {
    const reader = byteStream(stream);
    
    // Read messages from stream
    const readMessages = async () => {
      try {
        while (stream && !stream.closed) {
          const response = await reader.read();
          if (!response) continue;
          
          const responseText = toString(response.subarray());
          // Messages are handled by node.handle(CHAT_PROTOCOL)
          console.log('Stream message:', responseText);
        }
      } catch (err) {
        if (err.message !== 'stream ended') {
          console.error('Yamux stream error:', err);
        }
      }
    };
    
    // Start reading in background
    readMessages();
  }

  // Send start command to libp2p Bridge
  async sendStartCommand(privateKey, publicKey, appendOutput) {
    try {
      const startCommand = `command=start&priv_key=${privateKey}&pub_key=${publicKey}`;
      
      // Create new stream and send command
      const newStream = await this.createNewStream();
      const commandBytes = fromString(startCommand + '\n');
      await newStream.sink([commandBytes]);
      
      appendOutput('✅ Command=start sent successfully to libp2p Bridge');
      appendOutput('🔄 libp2p Bridge will initialize with your keys');
      
    } catch (err) {
      appendOutput(`❌ Failed to send command=start: ${err.message}`);
    }
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
