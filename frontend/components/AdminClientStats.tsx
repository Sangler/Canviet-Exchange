import React from "react";

export default function AdminClientStats() {
  return (
    <div className="bg-white rounded shadow-sm border p-6 mb-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Traffic & Sales</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">9,123</div>
          <div className="text-sm text-gray-600">New Clients</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }}></div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">22,643</div>
          <div className="text-sm text-gray-600">Recurring Clients</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-green-500 h-2 rounded-full" style={{ width: '70%' }}></div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">78,623</div>
          <div className="text-sm text-gray-600">Pageviews</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '85%' }}></div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">49,123</div>
          <div className="text-sm text-gray-600">Organic</div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-red-500 h-2 rounded-full" style={{ width: '60%' }}></div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Male</span>
          <span className="text-sm font-medium">53%</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-600">Female</span>
          <span className="text-sm font-medium">43%</span>
        </div>
      </div>
    </div>
  );
}
