import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const trafficData = [
  { name: "Jan", visits: 29703, users: 24093, pageviews: 78706, newUsers: 22123 },
  { name: "Feb", visits: 31200, users: 25400, pageviews: 82100, newUsers: 23500 },
  { name: "Mar", visits: 28900, users: 23200, pageviews: 75800, newUsers: 21800 },
  { name: "Apr", visits: 32100, users: 26800, pageviews: 85200, newUsers: 24900 },
  { name: "May", visits: 30500, users: 25100, pageviews: 79300, newUsers: 23200 },
  { name: "Jun", visits: 33800, users: 28200, pageviews: 89100, newUsers: 26100 },
  { name: "Jul", visits: 35200, users: 29500, pageviews: 92400, newUsers: 27300 },
];

const weeklyData = [
  { name: "Mon", value: 20 },
  { name: "Tue", value: 25 },
  { name: "Wed", value: 30 },
  { name: "Thu", value: 35 },
  { name: "Fri", value: 40 },
  { name: "Sat", value: 28 },
  { name: "Sun", value: 22 },
];

export default function AdminTrafficChart() {
  return (
    <div className="bg-white rounded shadow-sm border p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">Traffic</h3>
        <div className="text-sm text-gray-500">January - July 2023</div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trafficData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip />
              <Line type="monotone" dataKey="visits" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="pageviews" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Visits</span>
            <span className="font-semibold">29,703 Users (40%)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Unique</span>
            <span className="font-semibold">24,093 Users (20%)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Pageviews</span>
            <span className="font-semibold">78,706 Views (60%)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">New Users</span>
            <span className="font-semibold">22,123 Users (80%)</span>
          </div>
          
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={weeklyData}>
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
