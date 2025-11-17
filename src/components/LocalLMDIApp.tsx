import React, { useState, useCallback } from 'react';
import { BarChart3, TrendingUp, AlertCircle, CheckCircle, Download, RefreshCw } from 'lucide-react';
import LocalFileUpload, { UploadConfig } from './LocalFileUpload';
import LMDIResults from './LMDIResults';
import { LMDICalculator, LMDIResult } from '../services/lmdiCalculator';

const LocalLMDIApp: React.FC = () => {
  const [results, setResults] = useState<LMDIResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = useCallback(async (file: File, config: UploadConfig) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setResults(null);

    try {
      // Initialize the LMDI calculator
      const calculator = new LMDICalculator();
      
      // Process the Excel file and calculate LMDI
      const lmdiResults = await calculator.processExcelFile(file, {
        startYear: config.startYear,
        endYear: config.endYear,
        sheetName: config.sheetName,
        epsilon: config.epsilon
      });

      console.log('LMDI Results received:', lmdiResults);
      console.log('Charts data:', lmdiResults.charts);
      setResults(lmdiResults);
      setSuccess(true);
      
    } catch (err) {
      console.error('LMDI calculation error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during calculation');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReset = () => {
    setResults(null);
    setError(null);
    setSuccess(false);
  };

  const handleExportResults = () => {
    if (!results) return;
    
    try {
      const exportData = {
        config: results.config,
        summary: results.summary,
        decompositions: results.decompositions,
        charts: results.charts,
        exportTimestamp: new Date().toISOString()
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `lmdi_results_${results.config.startYear}_${results.config.endYear}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export results');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BarChart3 className="h-12 w-12 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900">LMDI Analysis Tool</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Analyze CO2 emission changes in manufacturing using the Logarithmic Mean Divisia Index (LMDI) method. 
            Process your data locally without uploading to any server.
          </p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="text-red-500 mr-3" size={24} />
            <div>
              <h3 className="text-red-800 font-semibold">Calculation Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="text-green-500 mr-3" size={24} />
            <div>
              <h3 className="text-green-800 font-semibold">Calculation Complete</h3>
              <p className="text-green-700">LMDI analysis completed successfully! Results are displayed below.</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!results ? (
          <LocalFileUpload 
            onFileUpload={handleFileUpload}
            isLoading={isLoading}
          />
        ) : (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">LMDI Results</h2>
                    <p className="text-gray-600">
                      Analysis Period: {results.config.startYear} - {results.config.endYear}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={handleExportResults}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Download className="mr-2" size={16} />
                    Export Results
                  </button>
                  
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <RefreshCw className="mr-2" size={16} />
                    New Analysis
                  </button>
                </div>
              </div>
            </div>

            {/* Results Display */}
            <LMDIResults results={results} />
          </div>
        )}

        {/* Features Info */}
        <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Complete LMDI Analysis</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Decomposes CO2 emission changes into 5 factors: Production, Economic Structure, 
                  Energy Intensity, Fuel Mix, and Emission Factor effects.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Privacy First</h4>
                <p className="text-sm text-gray-600 mt-1">
                  All calculations are performed locally in your browser. Your data never leaves your computer.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Interactive Visualizations</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Generate professional charts and graphs to visualize your LMDI decomposition results.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocalLMDIApp;