import type { jsPDF as JsPDF } from "jspdf";
import {
  GUIDE_REFERENCES,
  GUIDE_SECTIONS,
  GUIDE_VERSION,
  resolveGuideHref,
  type GuideNote,
  type GuideSection,
} from "@/lib/agent-guide";

type RGB = [number, number, number];

const COLORS = {
  emerald: [16, 185, 129] as RGB,
  emeraldDark: [4, 120, 87] as RGB,
  emeraldSoft: [236, 253, 245] as RGB,
  navy: [15, 23, 42] as RGB,
  text: [30, 41, 59] as RGB,
  muted: [100, 116, 139] as RGB,
  border: [226, 232, 240] as RGB,
  amberSoft: [255, 251, 235] as RGB,
  amber: [217, 119, 6] as RGB,
  redSoft: [254, 242, 242] as RGB,
  red: [220, 38, 38] as RGB,
  white: [255, 255, 255] as RGB,
};

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BODY_TOP = 28;
const BODY_BOTTOM = PAGE_H - 20;

export interface LoadedImage {
  data: string;
  width: number;
  height: number;
}

export type ImageLoader = (src: string) => Promise<LoadedImage | null>;

export const browserImageLoader: ImageLoader = (src) =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const maxW = 720;
      const scale = Math.min(1, maxW / img.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({
        data: canvas.toDataURL("image/jpeg", 0.82),
        width: canvas.width,
        height: canvas.height,
      });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

interface BuildOptions {
  origin: string;
  loadImage: ImageLoader;
  agentName?: string;
}

export async function buildAgentGuidePdf({ origin, loadImage, agentName }: BuildOptions) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });

  const imageSources = [
    "/logo-pimpay.png",
    ...GUIDE_SECTIONS.flatMap((s) => (s.image ? [s.image.src] : [])),
  ];
  const loaded = await Promise.all(imageSources.map((src) => loadImage(src)));
  const images = new Map(imageSources.map((src, i) => [src, loaded[i]]));

  const generatedAt = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  drawCover(pdf, images.get("/logo-pimpay.png") ?? null, generatedAt, agentName);

  pdf.addPage();
  const tocPage = pdf.getNumberOfPages();

  const sectionPages: number[] = [];
  GUIDE_SECTIONS.forEach((section, index) => {
    pdf.addPage();
    sectionPages.push(pdf.getNumberOfPages());
    drawSection(pdf, section, index + 1, images, origin);
  });

  pdf.addPage();
  const referencesPage = pdf.getNumberOfPages();
  drawReferences(pdf, origin);

  pdf.setPage(tocPage);
  drawToc(pdf, sectionPages, referencesPage);

  drawChrome(pdf, generatedAt);

  return pdf;
}

function setColor(pdf: JsPDF, kind: "text" | "fill" | "draw", color: RGB) {
  if (kind === "text") pdf.setTextColor(...color);
  else if (kind === "fill") pdf.setFillColor(...color);
  else pdf.setDrawColor(...color);
}

function drawCover(pdf: JsPDF, logo: LoadedImage | null, date: string, agentName?: string) {
  setColor(pdf, "fill", COLORS.navy);
  pdf.rect(0, 0, PAGE_W, PAGE_H, "F");

  setColor(pdf, "fill", COLORS.emerald);
  pdf.rect(0, 0, PAGE_W, 6, "F");
  pdf.rect(0, PAGE_H - 6, PAGE_W, 6, "F");

  if (logo) {
    const w = 34;
    const h = (logo.height / logo.width) * w;
    pdf.addImage(logo.data, "JPEG", MARGIN, 40, w, h);
  }

  pdf.setFont("helvetica", "bold");
  setColor(pdf, "text", COLORS.emerald);
  pdf.setFontSize(12);
  pdf.text("PIMOBIPAY  -  KIT TERRAIN AGENT", MARGIN, 100);

  setColor(pdf, "text", COLORS.white);
  pdf.setFontSize(34);
  pdf.text("Guide de", MARGIN, 120);
  pdf.text("Démarrage Rapide", MARGIN, 134);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(13);
  setColor(pdf, "text", [203, 213, 225]);
  const subtitle = pdf.splitTextToSize(
    "Le manuel complet de l'agent terrain : accueil client, dépôts, retraits, gestion du Float, sécurité, dépannage et liens de référence.",
    CONTENT_W - 20,
  ) as string[];
  pdf.text(subtitle, MARGIN, 150);

  setColor(pdf, "draw", COLORS.emerald);
  pdf.setLineWidth(0.8);
  pdf.line(MARGIN, 178, MARGIN + 40, 178);

  const meta: [string, string][] = [
    ["Version", GUIDE_VERSION],
    ["Mis à jour le", date],
    ["Chapitres", `${GUIDE_SECTIONS.length} + références`],
  ];
  if (agentName) meta.unshift(["Agent", agentName]);

  let y = 192;
  meta.forEach(([label, value]) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    setColor(pdf, "text", COLORS.muted);
    pdf.text(label.toUpperCase(), MARGIN, y);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    setColor(pdf, "text", COLORS.white);
    pdf.text(value, MARGIN + 45, y);
    y += 10;
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  setColor(pdf, "text", COLORS.muted);
  pdf.text("Document interne réservé aux agents agréés PIMOBIPAY.", MARGIN, PAGE_H - 16);
}

function drawToc(pdf: JsPDF, sectionPages: number[], referencesPage: number) {
  let y = BODY_TOP + 6;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  setColor(pdf, "text", COLORS.navy);
  pdf.text("Sommaire", MARGIN, y);
  y += 4;
  setColor(pdf, "draw", COLORS.emerald);
  pdf.setLineWidth(1);
  pdf.line(MARGIN, y, MARGIN + 24, y);
  y += 14;

  const entries = [
    ...GUIDE_SECTIONS.map((s, i) => ({ num: `${i + 1}`, title: s.title, page: sectionPages[i] })),
    { num: `${GUIDE_SECTIONS.length + 1}`, title: "Références et liens utiles", page: referencesPage },
  ];

  entries.forEach((entry) => {
    setColor(pdf, "fill", COLORS.emeraldSoft);
    pdf.roundedRect(MARGIN, y - 7, CONTENT_W, 13, 2, 2, "F");

    setColor(pdf, "fill", COLORS.emerald);
    pdf.circle(MARGIN + 7, y - 0.5, 4, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    setColor(pdf, "text", COLORS.white);
    pdf.text(entry.num, MARGIN + 7, y + 1, { align: "center" });

    pdf.setFontSize(12);
    setColor(pdf, "text", COLORS.text);
    pdf.text(entry.title, MARGIN + 16, y + 1);

    pdf.setFont("helvetica", "normal");
    setColor(pdf, "text", COLORS.emeraldDark);
    pdf.text(`p. ${entry.page}`, MARGIN + CONTENT_W - 4, y + 1, { align: "right" });

    pdf.link(MARGIN, y - 7, CONTENT_W, 13, { pageNumber: entry.page });
    y += 17;
  });

  y += 6;
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(9);
  setColor(pdf, "text", COLORS.muted);
  pdf.text("Astuce : cliquez sur un chapitre pour y accéder directement.", MARGIN, y);
}

function drawSection(
  pdf: JsPDF,
  section: GuideSection,
  number: number,
  images: Map<string, LoadedImage | null>,
  origin: string,
) {
  let y = BODY_TOP + 2;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  setColor(pdf, "text", COLORS.emerald);
  pdf.text(`CHAPITRE ${number}`, MARGIN, y);
  y += 9;

  pdf.setFontSize(20);
  setColor(pdf, "text", COLORS.navy);
  const titleLines = pdf.splitTextToSize(section.title, CONTENT_W) as string[];
  pdf.text(titleLines, MARGIN, y);
  y += titleLines.length * 8 + 1;

  setColor(pdf, "draw", COLORS.emerald);
  pdf.setLineWidth(1);
  pdf.line(MARGIN, y, MARGIN + 24, y);
  y += 9;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  setColor(pdf, "text", COLORS.muted);
  const summary = pdf.splitTextToSize(section.summary, CONTENT_W) as string[];
  pdf.text(summary, MARGIN, y);
  y += summary.length * 5.5 + 6;

  const image = section.image ? images.get(section.image.src) : null;
  const imageW = 62;
  const gap = 8;
  const textW = image ? CONTENT_W - imageW - gap : CONTENT_W;
  const columnTop = y;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  setColor(pdf, "text", COLORS.text);
  pdf.text("Étapes à suivre", MARGIN, y);
  y += 8;

  section.steps.forEach((step, i) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    const lines = pdf.splitTextToSize(step, textW - 11) as string[];
    const blockH = lines.length * 5 + 4;

    setColor(pdf, "fill", COLORS.emerald);
    pdf.circle(MARGIN + 3.5, y - 1.2, 3.5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    setColor(pdf, "text", COLORS.white);
    pdf.text(`${i + 1}`, MARGIN + 3.5, y + 0.3, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    setColor(pdf, "text", COLORS.text);
    pdf.text(lines, MARGIN + 11, y);
    y += blockH;
  });

  if (image && section.image) {
    const imageX = MARGIN + textW + gap;
    const imageH = Math.min((image.height / image.width) * imageW, 120);
    const drawW = (image.width / image.height) * imageH;
    const drawX = imageX + (imageW - drawW) / 2;

    setColor(pdf, "fill", COLORS.navy);
    pdf.roundedRect(drawX - 2, columnTop - 2, drawW + 4, imageH + 4, 3, 3, "F");
    pdf.addImage(image.data, "JPEG", drawX, columnTop, drawW, imageH);

    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(8.5);
    setColor(pdf, "text", COLORS.muted);
    const caption = pdf.splitTextToSize(section.image.caption, imageW) as string[];
    pdf.text(caption, imageX + imageW / 2, columnTop + imageH + 8, { align: "center" });

    y = Math.max(y, columnTop + imageH + 8 + caption.length * 4);
  }

  y += 4;
  section.notes?.forEach((note) => {
    y = drawNote(pdf, note, y);
  });

  if (section.links?.length) {
    y += 2;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    setColor(pdf, "text", COLORS.text);
    pdf.text("Accès rapide dans l'application :", MARGIN, y);
    y += 7;

    let x = MARGIN;
    section.links.forEach((link) => {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9.5);
      const w = pdf.getTextWidth(link.label) + 10;
      if (x + w > MARGIN + CONTENT_W) {
        x = MARGIN;
        y += 10;
      }
      setColor(pdf, "fill", COLORS.emeraldSoft);
      setColor(pdf, "draw", COLORS.emerald);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(x, y - 5, w, 7.5, 3.5, 3.5, "FD");
      setColor(pdf, "text", COLORS.emeraldDark);
      pdf.text(link.label, x + 5, y);
      pdf.link(x, y - 5, w, 7.5, { url: resolveGuideHref(link.href, origin) });
      x += w + 4;
    });
  }
}

function drawNote(pdf: JsPDF, note: GuideNote, y: number) {
  const isWarning = note.type === "warning";
  const bg = isWarning ? COLORS.redSoft : COLORS.amberSoft;
  const accent = isWarning ? COLORS.red : COLORS.amber;
  const label = isWarning ? "ATTENTION" : "ASTUCE";

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  const lines = pdf.splitTextToSize(note.text, CONTENT_W - 14) as string[];
  const h = lines.length * 5 + 13;

  setColor(pdf, "fill", bg);
  pdf.roundedRect(MARGIN, y, CONTENT_W, h, 2, 2, "F");
  setColor(pdf, "fill", accent);
  pdf.rect(MARGIN, y, 1.5, h, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  setColor(pdf, "text", accent);
  pdf.text(label, MARGIN + 7, y + 6.5);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  setColor(pdf, "text", COLORS.text);
  pdf.text(lines, MARGIN + 7, y + 12);

  return y + h + 5;
}

function drawReferences(pdf: JsPDF, origin: string) {
  let y = BODY_TOP + 2;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  setColor(pdf, "text", COLORS.emerald);
  pdf.text(`CHAPITRE ${GUIDE_SECTIONS.length + 1}`, MARGIN, y);
  y += 9;
  pdf.setFontSize(20);
  setColor(pdf, "text", COLORS.navy);
  pdf.text("Références et liens utiles", MARGIN, y);
  y += 4;
  setColor(pdf, "draw", COLORS.emerald);
  pdf.setLineWidth(1);
  pdf.line(MARGIN, y, MARGIN + 24, y);
  y += 10;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10.5);
  setColor(pdf, "text", COLORS.muted);
  pdf.text("Tous les liens sont cliquables depuis la version numérique de ce guide.", MARGIN, y);
  y += 9;

  const colLabel = MARGIN + 4;
  const colDesc = MARGIN + 52;
  const colUrl = MARGIN + 104;

  setColor(pdf, "fill", COLORS.navy);
  pdf.rect(MARGIN, y - 5.5, CONTENT_W, 9, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9.5);
  setColor(pdf, "text", COLORS.white);
  pdf.text("Ressource", colLabel, y);
  pdf.text("Description", colDesc, y);
  pdf.text("Lien", colUrl, y);
  y += 9;

  GUIDE_REFERENCES.forEach((ref, i) => {
    const url = resolveGuideHref(ref.href, origin);
    if (i % 2 === 0) {
      setColor(pdf, "fill", [248, 250, 252]);
      pdf.rect(MARGIN, y - 5.5, CONTENT_W, 10, "F");
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9.5);
    setColor(pdf, "text", COLORS.text);
    pdf.text(ref.label, colLabel, y);
    pdf.setFont("helvetica", "normal");
    setColor(pdf, "text", COLORS.muted);
    pdf.text(ref.description, colDesc, y);

    pdf.setFontSize(8.5);
    setColor(pdf, "text", COLORS.emeraldDark);
    const display = url.replace(/^https?:\/\//, "");
    const shown = pdf.splitTextToSize(display, MARGIN + CONTENT_W - colUrl - 2)[0] as string;
    pdf.textWithLink(shown, colUrl, y, { url });
    y += 10;
  });

  y += 8;
  setColor(pdf, "fill", COLORS.emeraldSoft);
  pdf.roundedRect(MARGIN, y, CONTENT_W, 34, 3, 3, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  setColor(pdf, "text", COLORS.emeraldDark);
  pdf.text("Besoin d'aide ?", MARGIN + 8, y + 10);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  setColor(pdf, "text", COLORS.text);
  pdf.text("WhatsApp agents (24/7) : +242 06 554 03 05", MARGIN + 8, y + 18);
  pdf.text("Telegram : t.me/pimobipay", MARGIN + 8, y + 24);
  pdf.textWithLink("Ouvrir un ticket support", MARGIN + 8, y + 30, {
    url: resolveGuideHref("/hub/support", origin),
  });
}

function drawChrome(pdf: JsPDF, date: string) {
  const total = pdf.getNumberOfPages();
  for (let page = 2; page <= total; page++) {
    pdf.setPage(page);

    setColor(pdf, "fill", COLORS.emerald);
    pdf.rect(0, 0, PAGE_W, 2.5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    setColor(pdf, "text", COLORS.emeraldDark);
    pdf.text("PIMOBIPAY", MARGIN, 13);
    pdf.setFont("helvetica", "normal");
    setColor(pdf, "text", COLORS.muted);
    pdf.text("Guide de Démarrage Rapide - Agent Terrain", PAGE_W - MARGIN, 13, { align: "right" });
    setColor(pdf, "draw", COLORS.border);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN, 16, PAGE_W - MARGIN, 16);

    pdf.line(MARGIN, BODY_BOTTOM + 4, PAGE_W - MARGIN, BODY_BOTTOM + 4);
    pdf.setFontSize(8.5);
    pdf.text(`${GUIDE_VERSION} - ${date}`, MARGIN, BODY_BOTTOM + 10);
    pdf.text(`Page ${page} / ${total}`, PAGE_W - MARGIN, BODY_BOTTOM + 10, { align: "right" });
  }
}
