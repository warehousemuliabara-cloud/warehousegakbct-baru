import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodeRendererProps {
  value: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  className?: string;
  id?: string;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({
  value,
  width = 1.6,
  height = 40,
  displayValue = true,
  fontSize = 12,
  className = '',
  id,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          lineColor: '#0f172a',
          width,
          height,
          displayValue,
          fontSize,
          font: 'monospace',
          textMargin: 3,
          margin: 6,
          background: 'transparent',
        });
      } catch (err) {
        console.error('Barcode rendering error:', err);
      }
    }
  }, [value, width, height, displayValue, fontSize]);

  return (
    <div id={id} className={`inline-flex flex-col items-center justify-center ${className}`}>
      <svg ref={svgRef} className="max-w-full overflow-visible" />
    </div>
  );
};
