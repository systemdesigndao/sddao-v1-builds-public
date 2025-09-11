import { useRef, useEffect } from 'react';
import useStore from '@/store';
import Message from './Message';

const ChatPanel = ({ onSendMessage, onKeyPress }) => {
  const { output, message, setMessage, isConnectedState } = useStore();
  const outputRef = useRef(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex flex-col">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">💬 P2P Bridge</h3>
        <p className="text-sm text-gray-500">Send messages to TON, libp2p through the bridge</p>
      </div>

      <div ref={outputRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {output.map((message, i) => (
          <Message key={i} message={message} />
        ))}
      </div>

      {isConnectedState && (
        <div className="p-6 border-t border-gray-200">
          <div className="flex space-x-3">
            <input 
              type="text" 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              onKeyPress={onKeyPress} 
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
              placeholder="Type your message here..." 
              autoComplete="off" 
            />
            <button 
              onClick={onSendMessage} 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPanel;
