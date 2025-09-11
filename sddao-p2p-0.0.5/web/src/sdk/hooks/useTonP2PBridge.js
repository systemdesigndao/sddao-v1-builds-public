import { useCallback, useRef } from 'react';
import { multiaddr } from '@multiformats/multiaddr';
import useStore from '@/store';
import { libp2pManager, messageHandler, keyManager } from '@/sdk';

// Custom hook for TON P2P Bridge functionality
export const useTonP2PBridge = () => {
  const {
    setStatus,
    setIsConnectedState,
    globalNode,
    isConnected,
  } = useStore();

  const internalConnectionRef = useRef(null);

  // Callback for appending output messages
  const appendOutput = useCallback((line) => {
    messageHandler.appendOutput(line);
  }, []);

  // Callback for generating keys
  const generateKeys = useCallback(async () => {
    await keyManager.generateKeys(appendOutput);
  }, [appendOutput]);

  // Callback for connecting to bridge
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
      await libp2pManager.connectToBridge(ma, appendOutput);
      setIsConnectedState(true);
      setStatus('connected');
      
    } catch (err) {
      appendOutput(`❌ Connection failed: ${err.message}`);
      setStatus('disconnected');
    }
  }, [appendOutput, setIsConnectedState, setStatus, globalNode, isConnected]);

  // Callback for sending messages
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
      await libp2pManager.sendMessage(messageToSend, appendOutput);
      setMessage('');
    } catch (err) {
      appendOutput(`❌ Failed to send message: ${err.message}`);
    }
  }, [appendOutput, globalNode, isConnected]);

  // Callback for handling key press events
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessageToGo();
    }
  }, [sendMessageToGo]);

  return {
    appendOutput,
    generateKeys,
    connect,
    sendMessageToGo,
    handleKeyPress,
  };
};
