import Box from '@mui/material/Box';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export interface QrCodeProps {
  readonly value: string;
  readonly label: string;
}

export function QrCode({ value, label }: QrCodeProps) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    QRCode.toString(value, { type: 'svg', margin: 1, width: 160 })
      .then((markup) => {
        if (active) {
          setSvg(markup);
        }
      })
      .catch(() => {
        if (active) {
          setSvg(null);
        }
      });
    return () => {
      active = false;
    };
  }, [value]);

  if (svg === null) {
    return (
      <Box
        role="img"
        aria-label={label}
        sx={{ width: 160, height: 160, bgcolor: 'grey.100' }}
      />
    );
  }

  return (
    <Box
      role="img"
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: svg }}
      sx={{ width: 160, height: 160, '& svg': { width: '100%', height: '100%' } }}
    />
  );
}
