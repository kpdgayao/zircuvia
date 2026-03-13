"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-900">Terms & Conditions</h1>

      <Card>
        <CardContent className="space-y-4 text-sm text-gray-700 leading-relaxed">
          <div>
            <h2 className="font-semibold text-gray-900">
              Environmental Fee — Ordinance No. 1058
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              City Government of Puerto Princesa
            </p>
          </div>

          <Separator />

          <p>
            Pursuant to Ordinance No. 1058, all tourists and visitors entering
            Puerto Princesa City, Palawan are required to pay an Environmental
            Fee to support the preservation and sustainability of the city&apos;s
            natural resources and eco-tourism sites.
          </p>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Fee Schedule</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Regular Tourist — PHP 150.00</li>
              <li>Palaweno / Palawan Resident — PHP 100.00</li>
              <li>Student / Senior Citizen / PWD — PHP 120.00</li>
              <li>Puerto Princesa City (PPC) Resident — Exempt</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Validity</h3>
            <p>
              The environmental fee is valid for <strong>10 days</strong> from
              the date of payment. It covers entry to all eco-tourism sites and
              protected areas within Puerto Princesa City during the validity
              period.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Conditions</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>The fee is <strong>non-transferable</strong>.</li>
              <li>
                Proof of payment must be presented at checkpoints upon request.
              </li>
              <li>
                PPC residents are exempt and must present valid government-issued
                ID with Puerto Princesa City address.
              </li>
              <li>
                Discounted rates require valid ID (student ID, senior citizen ID,
                PWD ID, or Palawan residency proof).
              </li>
            </ul>
          </div>

          <Separator />

          <p className="text-xs text-gray-500">
            By proceeding with the payment, you acknowledge that you have read,
            understood, and agree to the terms and conditions set forth above.
          </p>
        </CardContent>
      </Card>

      <Button
        className="w-full bg-[#2E7D32] hover:bg-[#1B5E20] text-white"
        size="lg"
        onClick={() => router.push("/fees/pay")}
      >
        I Accept — Proceed to Payment
      </Button>
    </div>
  );
}
