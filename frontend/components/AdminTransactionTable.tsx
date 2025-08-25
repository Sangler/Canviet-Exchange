import React from "react";

const users = [
  { 
    name: "Yiorgos Avraamu", 
    type: "New", 
    registered: "Jan 1, 2023", 
    country: "🇺🇸", 
    usage: 50, 
    period: "Jun 11, 2023 - Jul 10, 2023",
    payment: "$50.00",
    activity: "10 sec ago",
    avatar: "YA"
  },
  { 
    name: "Avram Tarasios", 
    type: "Recurring", 
    registered: "Jan 1, 2023", 
    country: "🇧🇷", 
    usage: 22, 
    period: "Jun 11, 2023 - Jul 10, 2023",
    payment: "$22.00",
    activity: "5 minutes ago",
    avatar: "AT"
  },
  { 
    name: "Quintin Ed", 
    type: "New", 
    registered: "Jan 1, 2023", 
    country: "🇮🇳", 
    usage: 74, 
    period: "Jun 11, 2023 - Jul 10, 2023",
    payment: "$74.00",
    activity: "1 hour ago",
    avatar: "QE"
  },
  { 
    name: "Enéas Kwadwo", 
    type: "New", 
    registered: "Jan 1, 2023", 
    country: "🇫🇷", 
    usage: 98, 
    period: "Jun 11, 2023 - Jul 10, 2023",
    payment: "$98.00",
    activity: "Last month",
    avatar: "EK"
  },
  { 
    name: "Agapetus Tadeáš", 
    type: "New", 
    registered: "Jan 1, 2023", 
    country: "🇪🇸", 
    usage: 22, 
    period: "Jun 11, 2023 - Jul 10, 2023",
    payment: "$22.00",
    activity: "Last week",
    avatar: "AT"
  },
  { 
    name: "Friderik Dávid", 
    type: "New", 
    registered: "Jan 1, 2023", 
    country: "🇵🇱", 
    usage: 43, 
    period: "Jun 11, 2023 - Jul 10, 2023",
    payment: "$43.00",
    activity: "Last week",
    avatar: "FD"
  },
];

export default function AdminTransactionTable() {
  return (
    <div className="bg-white rounded shadow-sm border p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">Users</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">User</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Country</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Usage</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Payment Method</th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Activity</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                      {user.avatar}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.type === 'New' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.type}
                        </span>
                        <span className="text-xs text-gray-500">Registered: {user.registered}</span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className="text-xl">{user.country}</span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{user.usage}%</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${user.usage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{user.period}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="text-sm font-medium text-gray-900">{user.payment}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-gray-600">Last login {user.activity}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
