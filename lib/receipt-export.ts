/**
 * Generates and downloads a clean, branded PNG receipt image using HTML5 Canvas.
 * Supports Web Share API (FEAT-023) and transaction memos (FEAT-004).
 */
export interface ReceiptDetails {
  txSig: string;
  amount: string;
  tokenSymbol: string;
  recipient: string;
  sender?: string;
  timestamp?: string;
  memo?: string;
}

export async function exportReceiptAsImage(details: ReceiptDetails): Promise<void> {
  const width = 600;
  const height = details.memo ? 800 : 750;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#0c101d");
  bgGrad.addColorStop(1, "#05070e");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient glow circles
  const glow = ctx.createRadialGradient(300, 150, 10, 300, 150, 250);
  glow.addColorStop(0, "rgba(99, 102, 241, 0.25)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, 400);

  // 3. Card Frame
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  // 4. DPI Header Logo
  ctx.fillStyle = "#6366F1";
  ctx.font = "bold 26px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("⚡ DPI PROTOCOL", 300, 80);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "14px sans-serif";
  ctx.fillText("Decentralized Payment Receipt · Solana Devnet", 300, 105);

  // 5. Success Checkmark Circle
  ctx.beginPath();
  ctx.arc(300, 170, 35, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
  ctx.fill();
  ctx.strokeStyle = "#10B981";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#10B981";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("✓", 300, 182);

  // 6. Amount
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 38px monospace";
  ctx.fillText(`${details.amount} ${details.tokenSymbol}`, 300, 250);

  ctx.fillStyle = "#34D399";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText("Payment Successful", 300, 280);

  // 7. Divider
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 310);
  ctx.lineTo(540, 310);
  ctx.stroke();

  // 8. Info rows
  const drawRow = (label: string, value: string, y: number, isMono: boolean = false) => {
    ctx.textAlign = "left";
    ctx.fillStyle = "#94A3B8";
    ctx.font = "14px sans-serif";
    ctx.fillText(label, 60, y);

    ctx.textAlign = "right";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = isMono ? "13px monospace" : "bold 14px sans-serif";
    ctx.fillText(value, 540, y);
  };

  const formattedTime = details.timestamp || new Date().toLocaleString();
  const shortSig = details.txSig
    ? `${details.txSig.slice(0, 12)}...${details.txSig.slice(-10)}`
    : "Confirmed";

  let curY = 350;
  drawRow("Recipient", details.recipient, curY);
  curY += 45;
  drawRow("Asset", details.tokenSymbol, curY);
  curY += 45;

  if (details.memo) {
    drawRow("Memo", `"${details.memo}"`, curY);
    curY += 45;
  }

  drawRow("Date & Time", formattedTime, curY);
  curY += 45;
  drawRow("Transaction Hash", shortSig, curY, true);
  curY += 45;
  drawRow("Status", "On-Chain Confirmed (Finalized)", curY);
  curY += 40;

  // 9. Footer
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  ctx.moveTo(60, curY);
  ctx.lineTo(540, curY);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#64748B";
  ctx.font = "12px sans-serif";
  ctx.fillText("Privacy like crypto. Simplicity like UPI.", 300, curY + 40);
  ctx.fillText("dpi.solana · Powered by Solana Devnet", 300, curY + 62);

  // 10. Web Share API Level 2 (FEAT-023) or Fallback Download
  const filename = `dpi-receipt-${details.recipient.replace(/^@/, "")}-${Date.now()}.png`;

  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        fallbackDownload(canvas, filename);
        resolve();
        return;
      }

      if (typeof navigator !== "undefined" && navigator.canShare) {
        try {
          const file = new File([blob], filename, { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: "DPI Payment Receipt",
              text: `Payment Receipt for ${details.amount} ${details.tokenSymbol} sent to ${details.recipient}`,
              files: [file],
            });
            resolve();
            return;
          }
        } catch (e: any) {
          if (e.name === "AbortError") {
            resolve();
            return;
          }
        }
      }

      fallbackDownload(canvas, filename);
      resolve();
    }, "image/png");
  });
}

function fallbackDownload(canvas: HTMLCanvasElement, filename: string) {
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
