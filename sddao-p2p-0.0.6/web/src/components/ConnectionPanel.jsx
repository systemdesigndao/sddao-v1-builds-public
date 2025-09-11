import useStore from '@/store';

const ConnectionPanel = ({ onConnect }) => {
  const { peer, setPeer } = useStore();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">🔗 Connection</h3>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label htmlFor="peer" className="block text-sm font-medium text-gray-700 mb-2">
            Bridge Address
          </label>
          <input 
            type="text" 
            id="peer" 
            value={peer} 
            onChange={(e) => setPeer(e.target.value)} 
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200" 
            placeholder="/ip4/<ip>/tcp/<port>/ws/p2p" 
            autoComplete="off" 
          />
        </div>
        <button 
          onClick={onConnect} 
          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
        >
          Connect
        </button>
      </div>
    </div>
  );
};

export default ConnectionPanel;
