import React, { useState, useCallback } from 'react';
import { Upload, FileText, Settings, AlertCircle, BarChart3, CheckCircle } from 'lucide-react';
import { LMDICalculator, LMDIConfig, LMDIResult } from '../services/lmdiCalculator';
import * as XLSX from 'xlsx';
import SampleDataGenerator from './SampleDataGenerator';

interface FileUploadProps {
  onFileUpload: (file: File, config: UploadConfig) => void;
  isLoading: boolean;
}

export interface UploadConfig {
  startYear: number;
  endYear: number;
  sheetName: string;
  epsilon?: number;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isLoading }) => {
  const [file, setFile] = useState<File | null>(null);
  const [config, setConfig] = useState<UploadConfig>({
    startYear: 2012,
    endYear: 2023,
    sheetName: 'Sheet1',
    epsilon: 1e-9
  });
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          droppedFile.type === 'application/vnd.ms-excel') {
        setFile(droppedFile);
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      onFileUpload(file, config);
    }
  };

  const validateYears = () => {
    return config.startYear < config.endYear && 
           config.startYear >= 1900 && 
           config.endYear <= 2100;
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
          <Upload className="mr-2" />
          Upload Excel Data File
        </h2>
        <p className="text-gray-600">
          Upload your manufacturing energy consumption data in Excel format for LMDI analysis
        </p>
      </div>

      {/* Sample Data Generator */}
      <SampleDataGenerator />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Configuration Section */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
            <Settings className="mr-2" size={20} />
            Analysis Configuration
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Year
              </label>
              <input
                type="number"
                value={config.startYear}
                onChange={(e) => setConfig(prev => ({ ...prev, startYear: parseInt(e.target.value) || 2012 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1900"
                max="2100"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Year
              </label>
              <input
                type="number"
                value={config.endYear}
                onChange={(e) => setConfig(prev => ({ ...prev, endYear: parseInt(e.target.value) || 2023 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1900"
                max="2100"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sheet Name
              </label>
              <input
                type="text"
                value={config.sheetName}
                onChange={(e) => setConfig(prev => ({ ...prev, sheetName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Sheet1"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Epsilon (Precision)
              </label>
              <input
                type="number"
                value={config.epsilon}
                onChange={(e) => setConfig(prev => ({ ...prev, epsilon: parseFloat(e.target.value) || 1e-9 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                step="0.000000001"
                min="0"
                max="0.001"
              />
            </div>
          </div>

          {!validateYears() && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-center">
              <AlertCircle className="text-red-500 mr-2" size={16} />
              <span className="text-red-700 text-sm">
                Please ensure start year is less than end year and both are between 1900-2100
              </span>
            </div>
          )}
        </div>

        {/* File Upload Section */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Excel Data File
          </label>
          
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="space-y-4">
              <FileText className="mx-auto text-gray-400" size={48} />
              
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {file ? file.name : 'Drop your Excel file here or click to browse'}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Supports .xlsx and .xls files up to 10MB
                </p>
              </div>
              
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                disabled={isLoading}
              />
              
              <label
                htmlFor="file-upload"
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {file ? 'Change File' : 'Choose File'}
              </label>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!file || isLoading || !validateYears()}
            className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white ${
              !file || isLoading || !validateYears()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
            }`}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <Upload className="mr-2" size={20} />
                Calculate LMDI
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FileUpload;