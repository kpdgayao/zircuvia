export function DiscoverIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Sky gradient */}
      <defs>
        <linearGradient id="sky" x1="120" y1="0" x2="120" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8F5E9" />
          <stop offset="1" stopColor="#C8E6C9" />
        </linearGradient>
        <linearGradient id="water" x1="120" y1="160" x2="120" y2="240" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4DB6AC" />
          <stop offset="1" stopColor="#26A69A" />
        </linearGradient>
      </defs>
      {/* Background circle */}
      <circle cx="120" cy="120" r="110" fill="url(#sky)" />
      {/* Water / sea */}
      <ellipse cx="120" cy="175" rx="110" ry="45" fill="url(#water)" opacity="0.6" />
      {/* Island */}
      <ellipse cx="120" cy="160" rx="60" ry="14" fill="#A5D6A7" />
      <ellipse cx="120" cy="158" rx="55" ry="10" fill="#81C784" />
      {/* Palm tree trunk */}
      <path d="M110 158 C108 130 115 110 120 95" stroke="#8D6E63" strokeWidth="4" strokeLinecap="round" fill="none" />
      {/* Palm leaves */}
      <path d="M120 95 C105 85 85 90 78 100" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M120 95 C130 80 150 78 160 85" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M120 95 C115 78 100 70 88 72" stroke="#388E3C" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M120 95 C135 82 155 85 162 95" stroke="#388E3C" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M120 95 C110 82 92 82 82 90" stroke="#43A047" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M120 95 C128 78 142 72 155 75" stroke="#43A047" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Second palm tree */}
      <path d="M145 158 C148 138 142 120 138 108" stroke="#8D6E63" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M138 108 C125 100 110 105 105 112" stroke="#2E7D32" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M138 108 C148 95 162 95 168 102" stroke="#388E3C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M138 108 C130 96 118 95 112 100" stroke="#43A047" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Small boat */}
      <path d="M60 180 Q75 188 90 180" stroke="#5D4037" strokeWidth="2" fill="#8D6E63" />
      <line x1="75" y1="180" x2="75" y2="170" stroke="#5D4037" strokeWidth="1.5" />
      <path d="M75 170 L85 175 L75 178" fill="white" opacity="0.9" />
      {/* Sun */}
      <circle cx="185" cy="55" r="22" fill="#FFD54F" opacity="0.8" />
      <circle cx="185" cy="55" r="16" fill="#FFE082" />
      {/* Birds */}
      <path d="M50 50 Q55 45 60 50" stroke="#546E7A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M65 40 Q70 35 75 40" stroke="#546E7A" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M45 65 Q49 61 53 65" stroke="#546E7A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Clouds */}
      <ellipse cx="60" cy="80" rx="20" ry="8" fill="white" opacity="0.5" />
      <ellipse cx="160" cy="40" rx="18" ry="6" fill="white" opacity="0.4" />
    </svg>
  );
}

export function PaymentIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="card-bg" x1="50" y1="80" x2="190" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2E7D32" />
          <stop offset="1" stopColor="#1B5E20" />
        </linearGradient>
        <linearGradient id="leaf-grad" x1="120" y1="30" x2="120" y2="210" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8F5E9" />
          <stop offset="1" stopColor="#C8E6C9" />
        </linearGradient>
      </defs>
      {/* Background circle */}
      <circle cx="120" cy="120" r="110" fill="url(#leaf-grad)" />
      {/* Decorative leaves */}
      <path d="M30 180 Q50 150 40 120 Q55 145 65 170 Z" fill="#A5D6A7" opacity="0.4" />
      <path d="M200 60 Q185 90 195 120 Q180 95 175 68 Z" fill="#A5D6A7" opacity="0.4" />
      {/* Card shadow */}
      <rect x="55" y="88" rx="12" ry="12" width="140" height="88" fill="#1B5E20" opacity="0.15" />
      {/* Payment card */}
      <rect x="50" y="82" rx="12" ry="12" width="140" height="88" fill="url(#card-bg)" />
      {/* Card chip */}
      <rect x="70" y="100" rx="3" ry="3" width="24" height="18" fill="#FFD54F" opacity="0.8" />
      <line x1="70" y1="107" x2="94" y2="107" stroke="#FFC107" strokeWidth="0.5" />
      <line x1="70" y1="112" x2="94" y2="112" stroke="#FFC107" strokeWidth="0.5" />
      <line x1="82" y1="100" x2="82" y2="118" stroke="#FFC107" strokeWidth="0.5" />
      {/* Card number dots */}
      {[0, 1, 2, 3].map((g) => (
        <g key={g}>
          {[0, 1, 2, 3].map((d) => (
            <circle key={d} cx={70 + g * 30 + d * 6} cy="136" r="2" fill="white" opacity="0.7" />
          ))}
        </g>
      ))}
      {/* Card text */}
      <text x="70" y="155" fill="white" opacity="0.6" fontSize="8" fontFamily="monospace">ECO-TOURIST</text>
      {/* Checkmark circle */}
      <circle cx="165" cy="65" r="24" fill="#43A047" />
      <circle cx="165" cy="65" r="20" fill="#66BB6A" />
      <path d="M154 65 L162 73 L177 58" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Small leaf decorations */}
      <path d="M85 195 Q95 180 110 185 Q95 190 88 200 Z" fill="#66BB6A" opacity="0.5" />
      <path d="M145 195 Q155 182 168 188 Q153 192 148 202 Z" fill="#66BB6A" opacity="0.5" />
      {/* Coins */}
      <circle cx="60" cy="195" r="14" fill="#FFD54F" opacity="0.7" />
      <circle cx="60" cy="195" r="10" fill="#FFE082" opacity="0.8" />
      <text x="56" y="199" fill="#F57F17" fontSize="10" fontWeight="bold">$</text>
      <circle cx="180" cy="195" r="12" fill="#FFD54F" opacity="0.6" />
      <circle cx="180" cy="195" r="8" fill="#FFE082" opacity="0.7" />
      <text x="177" y="199" fill="#F57F17" fontSize="8" fontWeight="bold">$</text>
    </svg>
  );
}

export function SaveIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="save-bg" x1="120" y1="10" x2="120" y2="230" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E0F2F1" />
          <stop offset="1" stopColor="#B2DFDB" />
        </linearGradient>
      </defs>
      {/* Background circle */}
      <circle cx="120" cy="120" r="110" fill="url(#save-bg)" />
      {/* Map/phone outline */}
      <rect x="72" y="50" rx="16" ry="16" width="96" height="150" fill="white" stroke="#E0E0E0" strokeWidth="2" />
      {/* Screen area */}
      <rect x="80" y="65" rx="4" ry="4" width="80" height="105" fill="#F5F5F5" />
      {/* Map pins on screen */}
      <circle cx="105" cy="95" r="6" fill="#2E7D32" />
      <circle cx="105" cy="95" r="3" fill="white" />
      <path d="M105 101 L105 108" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" />
      <circle cx="135" cy="115" r="5" fill="#F44336" opacity="0.7" />
      <circle cx="135" cy="115" r="2.5" fill="white" />
      <circle cx="95" cy="135" r="5" fill="#FF9800" opacity="0.7" />
      <circle cx="95" cy="135" r="2.5" fill="white" />
      {/* Map roads */}
      <path d="M85 105 L100 95 L120 100 L150 90" stroke="#BDBDBD" strokeWidth="1" strokeDasharray="3 2" />
      <path d="M85 125 L110 120 L135 130 L155 125" stroke="#BDBDBD" strokeWidth="1" strokeDasharray="3 2" />
      {/* Bookmark ribbon */}
      <path d="M148 42 L148 78 L138 70 L128 78 L128 42" fill="#2E7D32" />
      <path d="M148 42 L148 75 L138 68 L128 75 L128 42" fill="#43A047" />
      {/* Heart */}
      <path d="M50 110 C50 98 65 90 75 100 C85 90 100 98 100 110 C100 128 75 142 75 142 C75 142 50 128 50 110 Z" fill="#EF5350" opacity="0.2" />
      <path d="M55 112 C55 103 66 97 73 105 C80 97 91 103 91 112 C91 125 73 135 73 135 C73 135 55 125 55 112 Z" fill="#EF5350" opacity="0.4" />
      {/* Stars */}
      <path d="M170 80 L173 88 L182 88 L175 93 L177 101 L170 96 L163 101 L165 93 L158 88 L167 88 Z" fill="#FFD54F" opacity="0.7" />
      <path d="M180 135 L182 140 L188 140 L184 143 L185 148 L180 145 L175 148 L176 143 L172 140 L178 140 Z" fill="#FFD54F" opacity="0.5" />
      {/* Bottom notch */}
      <rect x="108" y="176" rx="2" ry="2" width="24" height="4" fill="#E0E0E0" />
    </svg>
  );
}

export function ZircuviaLogo({ className }: { className?: string }) {
  return (
    <img
      src="/icons/icon-512.png"
      alt="Zircuvia"
      className={className}
    />
  );
}
