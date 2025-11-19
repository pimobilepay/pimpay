import jsPDF from "jspdf";

export function generateStylishInvoice(invoice) {
  const pdf = new jsPDF("p", "mm", "a4");

  // --- COLORS ---
  const purple = "#6A2ADA";
  const gold = "#FFB347";
  const dark = "#1A1B27";

  // --- BACKGROUND GRADIENT ---
  pdf.setFillColor(26, 27, 39); 
  pdf.rect(0, 0, 210, 297, "F");

  // --- HEADER GRADIENT BAR ---
  pdf.setFillColor(106, 42, 218); // purple
  pdf.rect(0, 0, 210, 45, "F");

  pdf.setFillColor(180, 120, 255);
  pdf.rect(0, 0, 210, 25, "F");

  // --- TITLE ---
  pdf.setFont("Helvetica", "bold");
  pdf.setFontSize(28);
  pdf.setTextColor("#FFFFFF");
  pdf.text("FACTURE MPay", 20, 38);

  // PI LOGO CIRCLE
  pdf.setFillColor(255, 179, 71); // gold
  pdf.circle(180, 30, 16, "F");

  pdf.setFontSize(22);
  pdf.setTextColor("#000000");
  pdf.text("π", 174, 37);

  // --- CARD CONTAINER ---
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(15, 60, 180, 190, 6, 6, "F");

  // INNER TITLE
  pdf.setFontSize(18);
  pdf.setTextColor("#1A1B27");
  pdf.text("Détails du paiement", 25, 80);

  // SEPARATOR
  pdf.setDrawColor(220, 220, 220);
  pdf.line(25, 85, 185, 85);

  let y = 105;

  const addField = (label, value) => {
    pdf.setFont("Helvetica", "normal");
    pdf.setFontSize(12);
    pdf.setTextColor("#5A5C68");
    pdf.text(label, 25, y);

    pdf.setFont("Helvetica", "bold");
    pdf.setTextColor("#000000");
    pdf.text(value, 130, y);

    y += 15;
  };

  addField("ID Facture", invoice.id);
  addField("Date", invoice.date);
  addField("Montant", invoice.amount);
  addField("Expéditeur", invoice.sender);
  addField("Destinataire", invoice.receiver);
  addField("Méthode", invoice.method);
  addField("Statut", invoice.status);

  // --- FOOTER ---
  pdf.setFont("Helvetica", "italic");
  pdf.setFontSize(10);
  pdf.setTextColor("#AAAAAA");
  pdf.text("Merci d'utiliser MPay – Powered by PIMPAY", 45, 260);

  // DOWNLOAD
  pdf.save(`facture_${invoice.id}.pdf`);
}
