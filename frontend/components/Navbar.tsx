import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-gray-800 p-4 text-white flex justify-between">
  <div className="font-bold">CanViet Exchange</div>
      <div className="space-x-4">
        <Link href="/">Home</Link>
        <Link href="/transfers">Transfer</Link>

      </div>
    </nav>
  );
}
