import React from 'react';

interface MuliabaraLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: string;
}

export const MuliabaraLogo: React.FC<MuliabaraLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textColor = 'text-[#162C4E]',
}) => {
  const iconDimensions = {
    sm: { width: 32, height: 26, text: 'text-sm' },
    md: { width: 48, height: 40, text: 'text-lg' },
    lg: { width: 80, height: 66, text: 'text-2xl' },
    xl: { width: 120, height: 98, text: 'text-4xl' },
  };

  const current = iconDimensions[size];

  return (
    <div className={`inline-flex flex-col items-center justify-center select-none ${className}`}>
      {/* SVG Muliabara Geometric Icon */}
      <svg
        width={current.width}
        height={current.height}
        viewBox="0 0 160 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-xs"
      >
        <defs>
          <linearGradient id="muliabaraNavy" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3A66" />
            <stop offset="100%" stopColor="#13243F" />
          </linearGradient>
          <linearGradient id="muliabaraGreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8BD82B" />
            <stop offset="100%" stopColor="#68B11E" />
          </linearGradient>
          <linearGradient id="glossyOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Left thick diagonal navy stem */}
        <path
          d="M16 114 L68 18 C71 13 77 13 80 18 L104 56 C107 61 104 67 98 67 L58 67 C53 67 48 70 46 75 L28 114 C25 120 17 121 13 116 C10 112 11 106 16 100 Z"
          fill="url(#muliabaraNavy)"
        />

        {/* Center Navy Peak to bottom */}
        <path
          d="M84 16 L124 16 C130 16 134 21 131 27 L96 90 C93 95 86 96 82 91 L66 69 C63 65 65 59 70 59 L88 59 C93 59 97 55 95 50 L81 22 C79 18 81 16 84 16 Z"
          fill="url(#muliabaraNavy)"
        />

        {/* Right Lime Green Diagonal Accent */}
        <path
          d="M102 78 L126 36 C129 31 136 31 139 36 L154 62 C158 68 155 76 149 79 L116 99 C110 102 103 98 102 92 L101 84 C100 81 100 79 102 78 Z"
          fill="url(#muliabaraGreen)"
        />
        <path
          d="M112 114 C105 114 100 108 102 101 L108 86 C110 82 115 80 119 82 L144 96 C150 99 152 107 148 112 C145 115 141 117 136 117 L112 114 Z"
          fill="url(#muliabaraGreen)"
        />
      </svg>

      {/* Muliabara Typography */}
      {showText && (
        <span
          className={`font-black tracking-tight ${textColor} ${current.text} mt-1 select-none font-sans`}
          style={{ letterSpacing: '-0.03em' }}
        >
          Muliabara
        </span>
      )}
    </div>
  );
};
