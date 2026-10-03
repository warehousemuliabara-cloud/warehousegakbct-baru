import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeRendererProps {
  value: string;
  size?: number;
  fgColor?: string;
  bgColor?: string;
  level?: 'L' | 'M' | 'Q' | 'H';
  includeMargin?: boolean;
  className?: string;
  id?: string;
}

export const QRCodeRenderer: React.FC<QRCodeRendererProps> = ({
  value,
  size = 180,
  fgColor = '#0f172a',
  bgColor = '#ffffff',
  level = 'M',
  includeMargin = true,
  className = '',
  id,
}) => {
  if (!value) return null;

  return (
    <div id={id} className={`inline-flex flex-col items-center justify-center ${className}`}>
      <QRCodeSVG
        value={value}
        size={size}
        fgColor={fgColor}
        bgColor={bgColor}
        level={level}
        includeMargin={includeMargin}
        className="max-w-full h-auto drop-shadow-xs"
      />
    </div>
  );
};
