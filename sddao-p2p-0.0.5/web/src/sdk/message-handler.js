import useStore from '@/store';

class MessageHandler {
  constructor() {}

  // Process and append output messages
  appendOutput(line) {
    try {
      const query = JSON.parse(line);
      if (query.type === 'welcome') {
        this.appendOutput(`🌐 ${query.message} (ID: ${query.libp2p_pub_key})`);
        return;
      }
      if (query.type === 'ton_message') {
        const messageData = {
          text: query.message,
          isAnotherUserMessage: true,
          timestamp: Date.now()
        };
        
        const { setOutput } = useStore.getState();
        setOutput(prev => [...prev, messageData]);
        return;
      }
    } catch (err) {
      // Skip catching error
    }
    
    const messageData = {
      text: line,
      isAnotherUserMessage: false,
      timestamp: Date.now()
    };
    
    const { setOutput } = useStore.getState();
    setOutput(prev => [...prev, messageData]);
  }

  // Process internal connection messages
  processInternalConnection(message) {
    if (message.includes('connect=')) {
      return message;
    }
    return null;
  }

  // Format message for sending
  formatMessage(message, internalConnection) {
    if (internalConnection) {
      return 'message=' + internalConnection.split('=')[1] + ':' + message;
    }
    return message;
  }
}

export default MessageHandler;
