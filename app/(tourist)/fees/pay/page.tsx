"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CounterInput } from "@/components/counter-input";
import { formatCurrency } from "@/lib/utils";
import { FEE_PRICES } from "@/lib/fee-constants";

interface PayerLine {
  payerType: keyof typeof FEE_PRICES;
  label: string;
  price: number;
  quantity: number;
}

export default function PayPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [lines, setLines] = useState<PayerLine[]>([
    {
      payerType: "REGULAR_TOURIST",
      label: "Regular Tourist",
      price: FEE_PRICES.REGULAR_TOURIST,
      quantity: 0,
    },
    {
      payerType: "PALAWENO",
      label: "Palaweno / Palawan Resident",
      price: FEE_PRICES.PALAWENO,
      quantity: 0,
    },
    {
      payerType: "STUDENT",
      label: "Student",
      price: FEE_PRICES.STUDENT,
      quantity: 0,
    },
    {
      payerType: "SENIOR_CITIZEN",
      label: "Senior Citizen",
      price: FEE_PRICES.SENIOR_CITIZEN,
      quantity: 0,
    },
    {
      payerType: "PWD",
      label: "Person with Disability (PWD)",
      price: FEE_PRICES.PWD,
      quantity: 0,
    },
  ]);

  const updateQuantity = (index: number, quantity: number) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, quantity } : line))
    );
  };

  const totalAmount = lines.reduce(
    (sum, line) => sum + line.price * line.quantity,
    0
  );
  const totalPersons = lines.reduce((sum, line) => sum + line.quantity, 0);

  const handleSubmit = async () => {
    if (totalPersons === 0) {
      setError("Please add at least one person.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/fees/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: lines.map((l) => ({
            payerType: l.payerType,
            quantity: l.quantity,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Payment creation failed.");
        return;
      }

      const data = await res.json();
      // Redirect to checkout URL (mock or Xendit)
      if (data.checkoutUrl) {
        router.push(data.checkoutUrl);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">
        Pay Environmental Fee
      </h1>

      <Card>
        <CardContent className="space-y-4">
          {lines.map((line, index) => (
            <div key={line.payerType}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {line.label}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(line.price)} / person
                  </p>
                </div>
                <CounterInput
                  value={line.quantity}
                  onChange={(val) => updateQuantity(index, val)}
                  min={0}
                  max={99}
                />
              </div>
              {index < lines.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}

          <Separator />

          {/* PPC Resident info */}
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-sm font-medium text-[#2E7D32]">
              PPC Resident — Exempt
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Residents of Puerto Princesa City are exempt from the
              environmental fee. Present a valid government-issued ID with PPC
              address at checkpoints.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Running total */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                {totalPersons} person{totalPersons !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-gray-400">
                Valid for 10 days from date of payment
              </p>
            </div>
            <p className="text-xl font-bold text-[#2E7D32]">
              {formatCurrency(totalAmount)}
            </p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}

      <Button
        className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
        size="lg"
        onClick={handleSubmit}
        disabled={loading || totalPersons === 0}
      >
        {loading ? "Processing..." : "Proceed to Payment"}
      </Button>
    </div>
  );
}
