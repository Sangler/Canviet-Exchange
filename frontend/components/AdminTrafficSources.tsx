import React from "react";

const sources = [
  { name: "Organic Search", value: 191235, percent: 56, color: "bg-blue-500" },
  { name: "Facebook", value: 51223, percent: 15, color: "bg-indigo-500" },
  { name: "Twitter", value: 37564, percent: 11, color: "bg-cyan-500" },
  { name: "LinkedIn", value: 27319, percent: 8, color: "bg-blue-600" },
];

export default function AdminTrafficSources() {
  return (
    <div className="bg-white rounded shadow-sm border p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Traffic Sources</h3>
      <div className="space-y-4">
        {sources.map((src) => (
          <div key={src.name} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${src.color}`}></div>
              <span className="text-sm text-gray-700">{src.name}</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-900">{src.value.toLocaleString()}</span>
              <span className="text-sm text-gray-500">({src.percent}%)</span>
              <div className="w-16 bg-gray-200 rounded-full h-2">
                <div className={`h-2 rounded-full ${src.color}`} style={{ width: `${src.percent}%` }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
