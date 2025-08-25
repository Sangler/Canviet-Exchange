import React from "react";

export default function AdminStatsWidgets() {
  // Example static data
  const stats = [
    { label: "Total Transactions", value: 1280 },
    { label: "Total Volume (USD)", value: "$92,500" },
    { label: "Active Users", value: 320 },
    { label: "Pending Transfers", value: 14 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white rounded shadow p-4 flex flex-col items-center">
          <span className="text-lg font-semibold text-gray-700">{stat.label}</span>
          <span className="text-2xl font-bold text-blue-600 mt-2">{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
