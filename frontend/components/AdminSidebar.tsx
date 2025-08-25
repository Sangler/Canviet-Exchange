import Link from 'next/link';

export default function AdminSidebar() {
  return (
    <aside className="w-64 h-screen bg-gray-800 text-white flex flex-col shadow-lg">
      <div className="p-4 border-b border-gray-700">
        <div className="text-xl font-bold text-blue-400">CoreUI</div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        <Link href="/admin" className="flex items-center py-2 px-3 rounded text-blue-400 bg-blue-900 bg-opacity-50">
          <span className="mr-3">📊</span>
          Dashboard
        </Link>
        <div className="text-gray-400 text-xs uppercase tracking-wider mt-6 mb-2 px-3">Theme</div>
        <Link href="/admin/colors" className="flex items-center py-2 px-3 rounded hover:bg-gray-700 text-gray-300">
          <span className="mr-3">🎨</span>
          Colors
        </Link>
        <Link href="/admin/typography" className="flex items-center py-2 px-3 rounded hover:bg-gray-700 text-gray-300">
          <span className="mr-3">📝</span>
          Typography
        </Link>
        <div className="text-gray-400 text-xs uppercase tracking-wider mt-6 mb-2 px-3">Components</div>
        <Link href="/admin/base" className="flex items-center py-2 px-3 rounded hover:bg-gray-700 text-gray-300">
          <span className="mr-3">📦</span>
          Base
        </Link>
        <Link href="/admin/buttons" className="flex items-center py-2 px-3 rounded hover:bg-gray-700 text-gray-300">
          <span className="mr-3">🔘</span>
          Buttons
        </Link>
        <Link href="/admin/forms" className="flex items-center py-2 px-3 rounded hover:bg-gray-700 text-gray-300">
          <span className="mr-3">📋</span>
          Forms
        </Link>
        <Link href="/admin/charts" className="flex items-center py-2 px-3 rounded hover:bg-gray-700 text-gray-300">
          <span className="mr-3">📈</span>
          Charts
        </Link>
        <Link href="/admin/icons" className="flex items-center py-2 px-3 rounded hover:bg-gray-700 text-gray-300">
          <span className="mr-3">⭐</span>
          Icons
        </Link>
        <Link href="/admin/notifications" className="flex items-center py-2 px-3 rounded hover:bg-gray-700 text-gray-300">
          <span className="mr-3">🔔</span>
          Notifications
        </Link>
        <Link href="/admin/widgets" className="flex items-center py-2 px-3 rounded hover:bg-gray-700 text-gray-300">
          <span className="mr-3">🧩</span>
          Widgets
        </Link>
        <div className="text-gray-400 text-xs uppercase tracking-wider mt-6 mb-2 px-3">Extras</div>
        <Link href="/admin/pages" className="flex items-center py-2 px-3 rounded hover:bg-gray-700 text-gray-300">
          <span className="mr-3">📄</span>
          Pages
        </Link>
      </nav>
    </aside>
  );
}
