// Minimalist clean QR code generator using standard matrix algorithm or QR SVG URL
export function generateQRCodeSVG(text: string): string {
  // We can render a clean high-contrast SVG QR using reliable dynamic vector generation or data URL
  const encoded = encodeURIComponent(text);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encoded}&margin=10&format=svg`;
}
