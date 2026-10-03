import React, { useState, useEffect } from 'react';
import { Building2, Layers } from 'lucide-react';

interface CompanyLogoProps {
  logoUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  companyName?: string;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  logoUrl,
  className = '',
  size = 'md',
  companyName = 'GUDANG GA',
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [logoUrl]);

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  if (logoUrl && !hasError) {
    return (
      <div
        className={`relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-xs border border-slate-200/80 shrink-0 ${sizeClasses[size]} ${className}`}
      >
        <img
          src={logoUrl}
          alt={companyName}
          referrerPolicy="no-referrer"
          className="w-full h-full object-contain p-1"
          onError={() => {
            setHasError(true);
          }}
        />
      </div>
    );
  }

  // Default stylized GA emblem logo
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-xl bg-[#b8d24d] text-slate-900 font-black shadow-xs shrink-0 border border-lime-400/40 ${sizeClasses[size]} ${className}`}
    >
      <div className="flex items-center justify-center tracking-tighter font-extrabold select-none">
        <span className="text-slate-900">GA</span>
      </div>
      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-700 rounded-full border-2 border-slate-900" />
    </div>
  );
};
