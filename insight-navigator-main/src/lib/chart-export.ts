import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export async function exportChartAsPNG(element: HTMLElement, title: string) {
  const canvas = await html2canvas(element, {
    backgroundColor: "#0a0f1a",
    scale: 2,
    useCORS: true,
  });
  const link = document.createElement("a");
  link.download = `${title.replace(/\s+/g, "_")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export async function exportChartAsPDF(element: HTMLElement, title: string) {
  const canvas = await html2canvas(element, {
    backgroundColor: "#0a0f1a",
    scale: 2,
    useCORS: true,
  });
  const imgData = canvas.toDataURL("image/png");
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const pdf = new jsPDF({
    orientation: imgWidth > imgHeight ? "landscape" : "portrait",
    unit: "px",
    format: [imgWidth, imgHeight + 60],
  });

  pdf.setFillColor(10, 15, 26);
  pdf.rect(0, 0, imgWidth, imgHeight + 60, "F");
  pdf.setTextColor(230, 230, 240);
  pdf.setFontSize(24);
  pdf.text(title, 30, 40);
  pdf.addImage(imgData, "PNG", 0, 60, imgWidth, imgHeight);
  pdf.save(`${title.replace(/\s+/g, "_")}.pdf`);
}
