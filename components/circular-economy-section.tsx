import { Leaf, Trash2, RefreshCcw, Store, TreePine } from "lucide-react";

const PRINCIPLES = [
  {
    icon: Trash2,
    label: "Reduce",
    description: "Minimize single-use waste",
    color: "bg-red-50 text-red-600",
  },
  {
    icon: RefreshCcw,
    label: "Reuse",
    description: "Refill and repurpose",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Store,
    label: "Support Local",
    description: "Choose local businesses",
    color: "bg-amber-50 text-amber-600",
  },
  {
    icon: TreePine,
    label: "Protect Nature",
    description: "Preserve biodiversity",
    color: "bg-green-50 text-green-600",
  },
];

export function CircularEconomySection() {
  return (
    <section className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50/50 to-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
          <Leaf className="w-4 h-4 text-[#2E7D32]" />
        </div>
        <h2 className="font-semibold text-gray-800">Why Circular Tourism?</h2>
      </div>

      <p className="text-sm text-gray-600 leading-relaxed mb-4">
        Puerto Princesa generates 240 tons of waste daily. Circular tourism
        means choosing businesses that reduce waste, source locally, and protect
        Palawan&apos;s ecosystems.
      </p>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {PRINCIPLES.map((p) => (
          <div
            key={p.label}
            className="flex items-center gap-2.5 rounded-xl bg-white border border-gray-100 px-3 py-2.5 shadow-sm"
          >
            <div
              className={`w-9 h-9 rounded-lg ${p.color} flex items-center justify-center shrink-0`}
            >
              <p.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800">{p.label}</p>
              <p className="text-[11px] text-gray-500 leading-tight">
                {p.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 flex items-center gap-1.5">
        <Leaf className="w-3.5 h-3.5 text-[#2E7D32] shrink-0" />
        Look for the eco-certified badge when browsing.
      </p>
    </section>
  );
}
