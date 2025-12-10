import React from 'react';

const Loader = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[150px]">
      <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 border-r-pink-500 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-900 font-medium">Loading...</p>
    </div>
  );
};

export default Loader;
