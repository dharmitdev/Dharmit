import React from 'react';

interface LogoProps {
  className?: string;
}

export function Logo({ className = "w-6 h-6" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="dp-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFA26B" />
          <stop offset="60%" stopColor="#FF7D3B" />
          <stop offset="100%" stopColor="#E05B17" />
        </linearGradient>
      </defs>
      
      {/* Dynamic pipeline parallel path monogram */}
      <g
        stroke="url(#dp-logo-gradient)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Left 'd' circle bowl & stem */}
        {/* Bowl of 'd': starting at the top-right of the bowl, curving left, then down, then right to meet the stem at x=46 */}
        <path d="M 46,34 C 34,34 22,41 22,50 C 22,59 34,66 46,66" />
        {/* Stem of 'd': rising from the bottom point at x=46, straight up, curving slightly left at top */}
        <path d="M 46,66 L 46,22 C 46,18 43,15 38,15" />
        
        {/* Right 'p' circle bowl & stem */}
        {/* Bowl of 'p': starting at the bottom-left of the bowl, curving right, then up, then left to meet the stem at x=54 */}
        <path d="M 54,66 C 66,66 78,59 78,50 C 78,41 66,34 54,34" />
        {/* Stem of 'p': descending from the top point at x=54, straight down, curving slightly right at bottom */}
        <path d="M 54,34 L 54,78 C 54,82 57,85 62,85" />
      </g>
    </svg>
  );
}

export default Logo;
