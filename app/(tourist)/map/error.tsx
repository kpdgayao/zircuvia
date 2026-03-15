"use client";

export default function MapError({ reset }: { reset: () => void }) {
  return (
    <div className="fixed inset-0 top-14 bottom-[52px] z-10 bg-gray-100 flex items-center justify-center">
      <div className="text-center px-4">
        <p className="text-base font-medium text-gray-700 mb-1">
          Something went wrong
        </p>
        <p className="text-sm text-gray-500 mb-4">
          The map could not be loaded.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#2E7D32] text-white text-sm rounded-lg hover:bg-[#256629] transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
