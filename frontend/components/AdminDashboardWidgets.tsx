import React from "react";

const widgets = [
  { 
    label: "Users", 
    value: "26K", 
    change: "-12.4%", 
    color: "bg-blue-500",
    isNegative: true,
    icon: "👥"
  },
  { 
    label: "Income", 
    value: "$6,200", 
    change: "40.9%", 
    color: "bg-green-500",
    isNegative: false,
    icon: "💰"
  },
  { 
    label: "Conversion Rate", 
    value: "2.49%", 
    change: "84.7%", 
    color: "bg-yellow-500",
    isNegative: false,
    icon: "📊"
  },
  { 
    label: "Sessions", 
    value: "44K", 
    change: "-23.6%", 
    color: "bg-red-500",
    isNegative: true,
    icon: "📱"
  },
];

export default function AdminDashboardWidgets() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
      {widgets.map((w) => (
        <div key={w.label} className="bg-white rounded shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-gray-600 text-sm font-medium">{w.label}</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{w.value}</div>
              <div className={`text-sm mt-1 ${w.isNegative ? 'text-red-500' : 'text-green-500'}`}>
                {w.change} {w.isNegative ? '↓' : '↑'}
              </div>
            </div>
            <div className={`w-12 h-12 rounded-lg ${w.color} flex items-center justify-center text-white text-xl`}>
              {w.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
