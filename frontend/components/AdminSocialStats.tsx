import React from "react";

const socialData = [
  { platform: "FRIENDS", count: "89K", icon: "👥", color: "bg-blue-500" },
  { platform: "FEEDS", count: "459", icon: "📰", color: "bg-blue-500" },
  { platform: "FOLLOWERS", count: "973k", icon: "👤", color: "bg-green-500" },
  { platform: "TWEETS", count: "1.792", icon: "🐦", color: "bg-green-500" },
  { platform: "CONTACTS", count: "500", icon: "📞", color: "bg-yellow-500" },
  { platform: "FEEDS", count: "1.292", icon: "📰", color: "bg-yellow-500" },
  { platform: "EVENTS", count: "12+", icon: "📅", color: "bg-red-500" },
  { platform: "MEETINGS", count: "4", icon: "🤝", color: "bg-red-500" },
];

export default function AdminSocialStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {socialData.map((item, index) => (
        <div key={index} className="bg-white rounded shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-gray-900">{item.count}</div>
              <div className="text-xs text-gray-500 uppercase">{item.platform}</div>
            </div>
            <div className={`w-8 h-8 rounded ${item.color} flex items-center justify-center text-white text-sm`}>
              {item.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
