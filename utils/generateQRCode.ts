export async function generateQRCode(data: string): Promise<string> {
  // Utiliser une API gratuite de QR code
  return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(data)}`;
}