import './wasm_exec.js';
import { 
  Header, 
  ConnectionPanel, 
  KeysPanel, 
  NetworkPanel, 
  ChatPanel 
} from './components';
import { useTonP2PBridge, useAppInitialization } from './sdk';

const App = () => {
  const {
    generateKeys,
    connect,
    sendMessageToGo,
    handleKeyPress,
  } = useTonP2PBridge();

  useAppInitialization();

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header onGenerateKeys={generateKeys} />

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
