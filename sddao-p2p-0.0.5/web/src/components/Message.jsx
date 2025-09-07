const Message = ({ message }) => {
  const { text, isAnotherUserMessage } = message;
  
  if (!isAnotherUserMessage) {
    // System message with TON P2P Bridge avatar - left aligned
    return (
      <div className="w-full mb-4">
        <div className="flex items-start space-x-3 w-full">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <div className="min-w-0" style={{ maxWidth: 'calc(50% - 32px)' }}>
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <p className="text-sm text-gray-800 w-full break-words">{text}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1">TON P2P Bridge</p>
          </div>
        </div>
      </div>
    );
  } else {
    // TON Message - right aligned with TON avatar
    return (
      <div className="w-full mb-4">
        <div className="flex items-start justify-end space-x-3 w-full">
          <div className="min-w-0" style={{ maxWidth: 'calc(50% - 32px)' }}>
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <p className="text-sm text-gray-800 w-full break-words">{text}</p>
            </div>
            <p className="text-xs text-gray-500 mt-1 text-right">TON P2P Bridge</p>
          </div>
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">T</span>
          </div>
        </div>
      </div>
    );
  }
};

export default Message;
