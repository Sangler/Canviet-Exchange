import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-gray-800 p-4 text-white flex justify-between">
      <div className="font-bold">SVN Transfer</div>
      <div className="space-x-4">
        <Link href="/">Home</Link>
        <Link href="/transfers">Transfers</Link>
        <Link href="/admin">Admin</Link>
      </div>
    </nav>
  );
}
