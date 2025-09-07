import useStore from '../store';

const Header = ({ onGenerateKeys }) => {
  const { status } = useStore();

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl font-bold">T</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">TON P2P Bridge</h1>
              <p className="text-sm text-gray-500">P2P Communication Client</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {status === 'waiting' && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                {status}
              </div>
            )}
            {status === 'connected' && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                {status}
              </div>
            )}
            <button 
              onClick={onGenerateKeys} 
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Generate Keys
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
