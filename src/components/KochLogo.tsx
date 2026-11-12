import React from 'react';

interface KochLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'mark-only' | 'horizontal';
  textColor?: 'dark' | 'white';
}

export const KochLogo: React.FC<KochLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'horizontal',
  textColor = 'dark'
}) => {
  // Height sizing
  const heightClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-11',
    xl: 'h-16'
  }[size];

  // The 3D open cardboard box icon with red flaps matching user's official logo
  const BoxMark = ({ markClass = 'w-7 h-6' }: { markClass?: string }) => (
    <svg
      viewBox="0 0 100 80"
      className={`${markClass} shrink-0 drop-shadow-2xs`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Box bottom-left wall (Shaded Red) */}
      <polygon points="12,38 52,65 52,38 12,12" fill="#D60010" />

      {/* Box bottom-right wall (Bright Red) */}
      <polygon points="52,65 76,43 76,26 52,38" fill="#E60012" />

      {/* Box interior floor cavity */}
      <polygon points="12,12 52,38 76,26 36,0" fill="#B3000D" />
      <polygon points="17,14 50,35 71,24 38,3" fill="#E60012" />
      {/* White center hole */}
      <polygon points="26,16 47,29 61,22 40,9" fill="#FFFFFF" />

      {/* 4 Open Carton Flaps (White face with bright red borders) */}
      {/* Front-left flap */}
      <polygon
        points="2,32 40,46 52,37 14,23"
        fill="#FFFFFF"
        stroke="#E60012"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      {/* Front-right flap */}
      <polygon
        points="55,36 71,40 92,20 76,16"
        fill="#FFFFFF"
        stroke="#E60012"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      {/* Back-left flap */}
      <polygon
        points="0,17 18,1 42,8 24,24"
        fill="#FFFFFF"
        stroke="#E60012"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      {/* Back-right flap */}
      <polygon
        points="44,1 55,-4 92,6 81,11"
        fill="#FFFFFF"
        stroke="#E60012"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (variant === 'mark-only') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <BoxMark markClass={heightClasses} />
      </div>
    );
  }

  if (variant === 'full') {
    // Stacked version (Box on top, KOCH text below)
    return (
      <div className={`flex flex-col items-center justify-center gap-1 ${className}`}>
        <BoxMark markClass={size === 'xl' ? 'w-20 h-16' : size === 'lg' ? 'w-14 h-11' : 'w-10 h-8'} />
        <span
          className={`font-black tracking-widest font-mono select-none ${
            textColor === 'white' ? 'text-white' : 'text-slate-950'
          } ${
            size === 'xl' ? 'text-2xl' : size === 'lg' ? 'text-lg' : 'text-sm'
          }`}
          style={{ letterSpacing: '0.18em' }}
        >
          KOCH
        </span>
      </div>
    );
  }

  // Default: Horizontal compact
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <BoxMark markClass={size === 'lg' ? 'w-9 h-7' : size === 'sm' ? 'w-6 h-5' : 'w-8 h-6'} />
      <span
        className={`font-black font-mono select-none tracking-wider ${
          textColor === 'white' ? 'text-white' : 'text-slate-900'
        } ${
          size === 'lg' ? 'text-xl' : size === 'sm' ? 'text-sm' : 'text-base sm:text-lg'
        }`}
        style={{ letterSpacing: '0.12em' }}
      >
        KOCH
      </span>
    </div>
  );
};
