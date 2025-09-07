import React from 'react';
import useStore from '../store';

const KeysPanel = () => {
  const { 
    publicKey, 
    privateKey, 
    showPublicKey, 
    showPrivateKey, 
    setShowPublicKey, 
    setShowPrivateKey 
  } = useStore();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">🔐 Keys</h3>
      </div>
      <div className="space-y-4 p-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="public-key" className="block text-sm font-medium text-gray-700">
              Public Key
            </label>
            <button 
              type="button" 
              onClick={() => setShowPublicKey(!showPublicKey)} 
              className="text-xs text-blue-600 hover:text-blue-800" 
              style={{ display: publicKey ? 'block' : 'none' }}
            >
              👁️ {showPublicKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <input 
            type={showPublicKey ? 'text' : 'password'} 
            id="public-key" 
            readOnly 
            value={publicKey} 
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-600" 
            placeholder="Click 'Generate Keys' to create..." 
            autoComplete="off" 
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="private-key" className="block text-sm font-medium text-gray-700">
              Private Key
            </label>
            <button 
              type="button" 
              onClick={() => setShowPrivateKey(!showPrivateKey)} 
              className="text-xs text-blue-600 hover:text-blue-800" 
              style={{ display: privateKey ? 'block' : 'none' }}
            >
              👁️ {showPrivateKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <input 
            type={showPrivateKey ? 'text' : 'password'} 
            id="private-key" 
            readOnly 
            value={privateKey} 
            className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-600" 
            placeholder="Click 'Generate Keys' to create..." 
            autoComplete="off" 
          />
        </div>
      </div>
    </div>
  );
};

export default KeysPanel;
