import React from 'react';
import Plot from 'react-plotly.js';

interface PlotlyChartProps {
  data: any[];
  layout: any;
  config?: any;
  className?: string;
}

export const PlotlyChart: React.FC<PlotlyChartProps> = ({ 
  data, 
  layout, 
  config = { responsive: true }, 
  className = 'w-full h-96'
}) => {
  return (
    <div className={className}>
      <Plot
        data={data}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
      />
    </div>
  );
};