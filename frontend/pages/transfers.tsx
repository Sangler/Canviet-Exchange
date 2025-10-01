import React, { useState } from "react";
import RequireAuth from "../components/RequireAuth";

export default function Transfer() {
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [method, setMethod] = useState("fiat");

  return (
    <RequireAuth>
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
        <h2 className="text-2xl font-bold mb-4">Send Money</h2>
        <form>
          <label className="block mb-2">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full mb-4 p-2 border rounded"
          />
          <label className="block mb-2">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full mb-4 p-2 border rounded"
          >
            <option value="USD">USD</option>
            <option value="CAD">CAD</option>
            <option value="USDC">USDC (Crypto)</option>
          </select>
          <label className="block mb-2">Payment Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full mb-4 p-2 border rounded"
          >
            <option value="fiat">Fiat (Stripe)</option>
            <option value="crypto">Crypto (Coinbase)</option>
          </select>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            Transfer
          </button>
        </form>
      </div>
    </RequireAuth>
  );
}
