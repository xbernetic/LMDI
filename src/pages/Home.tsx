import React from 'react';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">LMDI Analysis Tool</h1>
        <p className="text-xl text-gray-600 mb-8">
          Please use the new LocalLMDIApp component for the desktop application.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-blue-800">
            The application has been updated to run locally without server dependencies.
            All calculations are performed in your browser.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;