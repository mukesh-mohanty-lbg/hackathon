import { QRCodeSVG } from "qrcode.react";

export default function BookingQRCode({ sessionId }) {
  return (
    <div className="flex flex-col items-center gap-2">
        <QRCodeSVG value={`https://www.oyci.org.uk/event-detail?instanceId=${sessionId}`} size={80} />
      <p className="text-xs text-gray-500">Scan QR to book session</p>
    </div>
  );
}
