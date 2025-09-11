import useStore from '@/store';

const NetworkPanel = () => {
  const { connections, multiaddrs } = useStore();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">🌐 Network</h3>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Active Connections</h4>
          <div className="bg-gray-50 rounded-md p-3 min-h-fit overflow-y-auto">
            <ul className="space-y-2 text-sm text-gray-600">
              {connections.length > 0 ? (
                connections.map((conn, i) => <li key={i}>{conn}</li>)
              ) : (
                <li className="text-gray-400 italic">No connections yet</li>
              )}
            </ul>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Local Addresses</h4>
          <div className="bg-gray-50 rounded-md p-3 min-h-fit overflow-x-auto">
            <ul className="space-y-2 text-sm text-gray-600">
              {multiaddrs.length > 0 ? (
                multiaddrs.map((addr, i) => (
                  <li key={i} className="whitespace-nowrap overflow-x-auto hide-scrollbar">
                    <span>
                      {addr}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-gray-400 italic">No addresses yet</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkPanel;
