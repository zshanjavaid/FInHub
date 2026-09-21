const LineChart = ({ data, labels, yAxisLabels, legend }) => {
  const maxValue = Math.max(...yAxisLabels);
  const chartHeight = 300;
  const chartWidth = 600;
  const padding = { top: 20, right: 40, bottom: 40, left: 60 };

  const getYPosition = (value) => {
    if (maxValue === 0) return chartHeight - padding.bottom;
    return chartHeight - padding.bottom - ((value / maxValue) * (chartHeight - padding.top - padding.bottom));
  };

  const getXPosition = (index) => {
    return padding.left + (index * ((chartWidth - padding.left - padding.right) / (labels.length - 1)));
  };

  const createPath = (values) => {
    const points = values.map((value, index) => {
      const x = getXPosition(index);
      const y = getYPosition(value);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
    return points;
  };

  return (
    <div className="w-full bg-white p-8 rounded-xl shadow-lg border-l-4 border-primary-500">
      <div className="mb-6 flex gap-4 justify-center">
        {data.map((dataset, index) => (
          <div key={index} className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-gray-50 border-2 border-gray-200">
            <div 
              className="w-6 h-1.5 rounded-full"
              style={{ backgroundColor: dataset.color }}
            />
            <span className="text-sm font-extrabold text-gray-700 uppercase tracking-[0.14em]">{legend[index]?.label || `Line ${index + 1}`}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-center overflow-x-auto bg-gray-50 p-6 rounded-lg border border-gray-200">
        <svg width={chartWidth} height={chartHeight + 20} className="overflow-visible">
        {yAxisLabels.map((label, index) => {
          const yPos = chartHeight - padding.bottom - ((label / maxValue) * (chartHeight - padding.top - padding.bottom));
          return (
            <g key={index}>
              <line
                x1={padding.left}
                y1={yPos}
                x2={chartWidth - padding.right}
                y2={yPos}
                stroke="#e2e8f0"
                strokeWidth="1"
                strokeDasharray="3,3"
                opacity="0.6"
              />
              <text
                x={padding.left - 12}
                y={yPos + 4}
                textAnchor="end"
                className="text-xs fill-gray-600 font-light tabular-nums"
              >
                ${label}
              </text>
            </g>
          );
        })}
        {labels.map((label, index) => {
          const xPos = getXPosition(index);
          return (
            <text
              key={index}
              x={xPos}
              y={chartHeight - 8}
              textAnchor="middle"
              className="text-xs fill-gray-600 font-light tabular-nums"
            >
              {label}
            </text>
          );
        })}
        {data.map((dataset, datasetIndex) => (
          <g key={datasetIndex}>
            <path
              d={createPath(dataset.values, dataset.color)}
              fill="none"
              stroke={dataset.color}
              strokeWidth="2.5"
              strokeDasharray={dataset.style === 'dashed' ? '5,5' : '0'}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {dataset.values.map((value, pointIndex) => {
              const x = getXPosition(pointIndex);
              const y = getYPosition(value);
              return (
                <circle
                  key={pointIndex}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={dataset.color}
                  stroke="white"
                  strokeWidth="1.5"
                />
              );
            })}
          </g>
        ))}
        </svg>
      </div>
    </div>
  );
};

export default LineChart;
