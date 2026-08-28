// Generate small text-based sample PDFs used by the evaluation harness and for
// manual multilingual testing. English + French are produced here; the standard
// Helvetica font (WinAnsi) covers French accents. Run: `node scripts/make-sample-pdfs.mjs`.
//
// Arabic is intentionally not generated: correct Arabic PDFs need right-to-left
// text shaping (HarfBuzz) that pdf-lib's standard fonts don't provide. The RAG
// pipeline itself is Unicode-safe (see TECH_STACK.md → Multilingual), so a real
// text-based Arabic PDF dropped into docs/sample/ works via the same path.

import { PDFDocument, StandardFonts } from "pdf-lib";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "docs", "sample");

/** Draw an array of lines onto a single A4 page. */
async function makePdf(title, lines) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([595, 842]);

  let y = 790;
  page.drawText(title, { x: 50, y, size: 18, font: bold });
  y -= 40;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 12, font });
    y -= 22;
  }
  return doc.save();
}

const EN_TITLE = "Acme Robotics — Product Handbook";
const EN_LINES = [
  "Acme Robotics was founded in 2011 in Lyon, France.",
  "The flagship product is the Atlas-7 autonomous lawn mower.",
  "The standard warranty period is 24 months from the date of purchase.",
  "Customer support is available Monday to Friday, from 9am to 6pm.",
  "The Atlas-7 battery provides up to 90 minutes of continuous operation.",
  "Firmware updates are delivered automatically over Wi-Fi every quarter.",
  "The company's headquarters moved to Paris in 2018.",
];

const FR_TITLE = "Acme Robotique — Manuel Produit";
const FR_LINES = [
  "Acme Robotique a été fondée en 2011 à Lyon, en France.",
  "Le produit phare est la tondeuse autonome Atlas-7.",
  "La période de garantie standard est de 24 mois à compter de l'achat.",
  "Le support client est disponible du lundi au vendredi, de 9h à 18h.",
  "La batterie de l'Atlas-7 offre jusqu'à 90 minutes d'autonomie.",
  "Les mises à jour du micrologiciel sont livrées chaque trimestre.",
  "Le siège social a déménagé à Paris en 2018.",
];

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(join(OUT_DIR, "en.pdf"), await makePdf(EN_TITLE, EN_LINES));
writeFileSync(join(OUT_DIR, "fr.pdf"), await makePdf(FR_TITLE, FR_LINES));
console.log("Wrote docs/sample/en.pdf and docs/sample/fr.pdf");
