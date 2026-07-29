import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadImgCompressed } from './pdfImage';
import config from '@/config/environment';

/** Item specs are stored as [{key, value}] — flatten to "key: value, key: value" */
function fmtSpecs(specifications) {
  if (!Array.isArray(specifications) || !specifications.length) return '---';
  return specifications
    .filter(s => s && (s.key || s.value))
    .map(s => (s.key ? `${s.key}: ${s.value ?? ''}` : s.value))
    .join(', ') || '---';
}

/** Format date: DD MMM YYYY */
function fmtDate(d) {
  if (!d) return '---';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) { return String(d).slice(0, 10); }
}

// ─── Colour helpers (RGB arrays) ────────────────────────────────────────────
const NAVY   = [13,  71, 161];
const BLUE   = [25, 118, 210];
const LBLUE  = [227, 242, 253];
const ORANGE = [200, 75,   0];
const GREEN  = [27,  94,  32];
const GREY   = [80,  80,  80];
const LGREY  = [245, 245, 245];
const DGREY  = [50,  50,  50];
const BORDER = [180, 180, 180];
const WHITE  = [255, 255, 255];
const BLACK  = [0,   0,   0];

const STATUS_COLORS = {
  approved: GREEN,
  pending: ORANGE,
  rejected: [183, 28, 28],
};

/**
 * Generates an attractive, single-page A4 "Order Summary" PDF for exactly
 * ONE order — used by the Store Orders row Print button and the View Order
 * modal's "Print Summary" action.
 *
 * @param {Object} order        — a single order document (orderCode, orderDate,
 *                                 requestedDeliveryDate, priority, status, notes,
 *                                 customer{name,mobile,email,address,city,state},
 *                                 products[{product:{name,specification}, quantity}])
 * @param {string|null} logoDataUrl — base64 data URL of the Samtek logo (or null)
 * @param {Object} company       — { name, address, city, state, mobile, email, gst, stampUrl }
 *                                 stampUrl is the company admin's uploaded signature/stamp
 *                                 (relative path from GET /api/companies/:id, e.g. "/uploads/company-stamps/xyz.png")
 */
export async function generateOrderSummaryPDF(order, logoDataUrl, company = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const ML = 36, MR = PW - 36, MW = MR - ML;

  const {
    orderCode = '---',
    orderDate,
    requestedDeliveryDate,
    priority = '---',
    status = '---',
    notes,
    customer = {},
    products = [],
  } = order || {};

  const logoImg = logoDataUrl ? await loadImgCompressed(logoDataUrl, 220, 'jpeg') : null;

  // Company admin's uploaded signature/stamp — only drawn if actually uploaded, never a placeholder
  let stampImg = null;
  if (company.stampUrl) {
    const stampPath = company.stampUrl.startsWith('http') ? company.stampUrl : `${config.baseURL}${company.stampUrl}`;
    stampImg = await loadImgCompressed(stampPath, 200, 'png');
  }

  let y = 0;

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, 5, 'F');
  y = 14;

  if (logoImg) {
    try { doc.addImage(logoImg, 'JPEG', ML, y, 88, 52); } catch (_) {}
  }

  const cx = logoImg ? ML + 96 : ML;
  const compName = (company.name || 'SAMTEK MACHINERY').toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(...NAVY);
  doc.text(compName, cx, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  let cy2 = y + 27;
  const addrParts = [company.address, company.city, company.state].filter(Boolean);
  if (addrParts.length) { doc.text(addrParts.join(', '), cx, cy2); cy2 += 11; }
  if (company.mobile || company.email) {
    doc.text([company.mobile && ('Ph: ' + company.mobile), company.email].filter(Boolean).join('   |   '), cx, cy2);
    cy2 += 11;
  }
  if (company.gst) doc.text('GSTIN: ' + company.gst, cx, cy2);

  y = 76;

  // ── Title band ─────────────────────────────────────────────────────────
  doc.setFillColor(...ORANGE);
  doc.rect(0, y, PW, 26, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  doc.text('ORDER SUMMARY', PW / 2, y + 17, { align: 'center' });
  y += 34;

  // ── Meta info row ────────────────────────────────────────────────────────
  const metaBoxH = 40;
  doc.setFillColor(...LBLUE);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.5);
  doc.rect(ML, y, MW, metaBoxH, 'FD');

  const statusColor = STATUS_COLORS[String(status).toLowerCase()] || GREY;
  const metaItems = [
    { label: 'Order Code',   value: orderCode },
    { label: 'Order Date',   value: fmtDate(orderDate) },
    { label: 'Delivery Date', value: fmtDate(requestedDeliveryDate) },
    { label: 'Priority',     value: priority || '---' },
    { label: 'Status',       value: String(status || '---').toUpperCase(), color: statusColor },
  ];
  const mW = MW / metaItems.length;
  metaItems.forEach((m, i) => {
    const mx = ML + i * mW + 5;
    const maxValW = mW - 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...NAVY);
    doc.text(m.label, mx, y + 10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(m.color || DGREY));
    let valFs = 8;
    doc.setFontSize(valFs);
    let valLines = doc.splitTextToSize(String(m.value), maxValW);
    if (valLines.length > 2) {
      valFs = 6.5;
      doc.setFontSize(valFs);
      valLines = doc.splitTextToSize(String(m.value), maxValW);
    }
    doc.text(valLines.slice(0, 2), mx, y + 21);
    if (i < metaItems.length - 1) {
      doc.setDrawColor(...BORDER);
      doc.line(ML + (i + 1) * mW, y + 4, ML + (i + 1) * mW, y + metaBoxH - 4);
    }
  });
  y += metaBoxH + 14;

  // ══════════════════════════════════════════════════════════════════════════
  // CUSTOMER DETAILS
  // ══════════════════════════════════════════════════════════════════════════
  const custFields = [
    ['Name',    customer.name    || '---'],
    ['Mobile',  customer.mobile  || '---'],
    ['Email',   customer.email   || '---'],
    ['Address', [customer.address, customer.city, customer.state].filter(Boolean).join(', ') || '---'],
  ];
  const lh = 14, boxH = custFields.length * lh + 12;

  doc.setFillColor(...NAVY);
  doc.rect(ML, y, MW, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text('CUSTOMER DETAILS', ML + 6, y + 9.5);
  y += 14;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.setFillColor(...WHITE);
  doc.rect(ML, y, MW, boxH, 'FD');

  custFields.forEach(([lbl, val], i) => {
    const ry = y + 8 + i * lh;
    doc.setFont('helvetica', 'bold');   doc.setFontSize(7.5); doc.setTextColor(...GREY);  doc.text(lbl + ':', ML + 6, ry);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);   doc.setTextColor(...BLACK);
    doc.text(doc.splitTextToSize(String(val), MW - 76)[0], ML + 68, ry);
  });
  y += boxH + 14;

  // ══════════════════════════════════════════════════════════════════════════
  // PRODUCT / ITEMS TABLE
  // ══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...BLUE);
  doc.rect(ML, y, MW, 14, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...WHITE);
  doc.text('PRODUCT DETAILS', ML + 6, y + 9.5);
  y += 14;

  const head = [['#', 'Product Name', 'Specification', 'Qty']];
  const body = products.map((p, idx) => [
    String(idx + 1),
    p.product?.name || p.productName || '---',
    fmtSpecs(p.product?.specifications),
    String(p.quantity ?? '---'),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: 36 },
    head,
    body: body.length ? body : [[{ content: 'No products found', colSpan: 4, styles: { halign: 'center', textColor: GREY } }]],
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, lineColor: BORDER, lineWidth: 0.4, textColor: BLACK },
    headStyles: { fillColor: LGREY, textColor: BLACK, fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 0: { halign: 'center', cellWidth: 24 }, 1: { halign: 'left' }, 2: { halign: 'left', cellWidth: 180 }, 3: { halign: 'center', cellWidth: 60 } },
    alternateRowStyles: { fillColor: [250, 250, 255] },
  });
  y = doc.lastAutoTable.finalY + 14;

  // ══════════════════════════════════════════════════════════════════════════
  // NOTES
  // ══════════════════════════════════════════════════════════════════════════
  if (notes) {
    const noteLines = doc.splitTextToSize(String(notes), MW - 16);
    const noteBoxH = Math.max(30, noteLines.length * 11 + 20);
    if (y + noteBoxH > PH - 130) { doc.addPage(); y = 36; }
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(217, 160, 40);
    doc.setLineWidth(0.6);
    doc.rect(ML, y, MW, noteBoxH, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(180, 120, 10);
    doc.text('NOTES', ML + 8, y + 12);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(...DGREY);
    doc.text(noteLines, ML + 8, y + 24);
    y += noteBoxH + 14;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER — Note (left) + Authorised Signatory (right)
  // ══════════════════════════════════════════════════════════════════════════
  if (y > PH - 100) { doc.addPage(); y = 36; }
  y = Math.max(y, PH - 92);

  doc.setDrawColor(...NAVY); doc.setLineWidth(1);
  doc.line(ML, y, MR, y);
  y += 8;

  const footH = 60;
  const sigW  = 150;

  doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(...GREY);
  doc.text(
    'This is a computer-generated order summary for dispatch verification.',
    ML, y + footH / 2, { maxWidth: MW - sigW - 16 }
  );

  const sigX = MR - sigW;
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.5);
  doc.setFillColor(...LGREY);
  doc.rect(sigX, y, sigW, footH, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...NAVY);
  doc.text('For ' + (company.name || 'SAMTEK MACHINERY'), sigX + sigW / 2, y + 12, { align: 'center' });

  if (stampImg) {
    try {
      const imgW = 70, imgH = 34;
      doc.addImage(stampImg, sigX + (sigW - imgW) / 2, y + 15, imgW, imgH);
    } catch (_) {}
  }

  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...GREY);
  doc.text('Authorised Signatory', sigX + sigW / 2, y + footH - 10, { align: 'center' });

  // ── Bottom navy band ─────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, PH - 5, PW, 5, 'F');

  // ── Page numbers ─────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GREY);
    doc.text('Page ' + i + ' of ' + totalPages, PW - 36, PH - 8, { align: 'right' });
    doc.text('Order Summary  |  ' + orderCode, ML, PH - 8);
  }

  doc.save('Order-Summary-' + orderCode + '-' + new Date().toISOString().slice(0, 10) + '.pdf');
}
