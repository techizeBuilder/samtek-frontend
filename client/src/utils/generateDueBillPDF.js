import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadImgCompressed } from './pdfImage';

// ─── Safe number formatter (no Unicode symbols — jsPDF default font safe) ───
function fmtAmt(n) {
  const num = parseFloat(n) || 0;
  // Indian grouping: 12,34,567.00
  const fixed = num.toFixed(2);
  const [intPart, dec] = fixed.split('.');
  let result = '';
  const s = intPart.replace(/^-/, '');
  const negative = intPart.startsWith('-');
  if (s.length <= 3) {
    result = s;
  } else {
    const last3 = s.slice(-3);
    const rest  = s.slice(0, -3);
    const groups = [];
    for (let i = rest.length; i > 0; i -= 2) groups.unshift(rest.slice(Math.max(0, i - 2), i));
    result = groups.join(',') + ',' + last3;
  }
  return (negative ? '-' : '') + 'Rs. ' + result + '.' + dec;
}

/** Format date: DD MMM YYYY */
function fmtDate(d) {
  if (!d) return '---';
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) { return String(d).slice(0, 10); }
}

/** Convert number to Indian words */
function numberToWords(num) {
  if (!num || num === 0) return 'Zero Rupees Only';
  const ones  = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'];
  const teens = ['Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens  = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const two   = n => n < 10 ? ones[n] : n < 20 ? teens[n - 10] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  const three = n => n < 100 ? two(n) : ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + two(n % 100) : '');
  const toW   = n => {
    if (n < 1000) return three(n);
    const cr = Math.floor(n / 10000000), lk = Math.floor((n % 10000000) / 100000),
          th = Math.floor((n % 100000)  / 1000),                rem = n % 1000;
    return (cr ? toW(cr) + ' Crore ' : '') + (lk ? toW(lk) + ' Lakh ' : '') +
           (th ? toW(th) + ' Thousand ' : '') + (rem ? three(rem) : '');
  };
  const fixed = parseFloat(num).toFixed(2);
  const [r, p] = fixed.split('.');
  const rup = parseInt(r), pai = parseInt(p);
  return toW(rup) + ' Rupees' + (pai > 0 ? ' and ' + toW(pai) + ' Paise' : '') + ' Only';
}

// ─── Colour helpers (RGB arrays) ────────────────────────────────────────────
const NAVY   = [13,  71, 161];
const BLUE   = [25, 118, 210];
const LBLUE  = [227, 242, 253];
const ORANGE = [200, 75,   0];
const RED    = [183, 28,  28];
const LRED   = [255, 235, 238];
const GREEN  = [27,  94,  32];
const LGREEN = [232, 245, 233];
const GREY   = [80,  80,  80];
const LGREY  = [245, 245, 245];
const DGREY  = [50,  50,  50];
const BORDER = [180, 180, 180];
const WHITE  = [255, 255, 255];
const BLACK  = [0,   0,   0];

/**
 * Main export.
 * @param {Object} data        — response.data from GET /api/accounts/packed-orders/:jobId/due-bill
 * @param {string|null} logoDataUrl  — base64 data URL of the logo (or null)
 */
export async function generateDueBillPDF(data, logoDataUrl) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const ML = 36, MR = PW - 36, MW = MR - ML;

  const {
    orderCode = '', invoiceNumber = '', billDate, packedDate, saleDate,
    machineName = '', machineCode = '', serialNumber = '',
    customer = {}, company = {},
    items = [],
    subtotal = 0, taxAmount = 0, gstType = 'CGST_SGST',
    totalAmount = 0, advancedPaymentAmount = 0, paidAmount = 0, balanceAmount = 0,
    advancePayments = [], postInvoicePayments = [],
    // Customer master fields (preferred for payment summary display)
    customerOutstanding = 0, customerAdvance = 0,
    displayTotal = 0, displayPaid = 0, displayDue = 0,
    additionalCharges = 0,
  } = data;

  // Use customer master values when available, else fall back to invoice values
  // Order-wise figures — the due bill belongs to ONE order:
  // Total = order invoice total, Paid = advance + receipts against this order
  const cmTotal   = displayTotal > 0 ? displayTotal : totalAmount;
  const cmPaid    = displayTotal > 0 ? displayPaid  : (advancedPaymentAmount + paidAmount);
  const cmDue     = displayTotal > 0 ? displayDue   : balanceAmount;
  const cmAdvance = advancedPaymentAmount || 0;

  // Compress logo + stamp before embedding — raw embeds made the PDF ~16 MB;
  // resized JPEG/PNG keeps the whole file in KBs
  const logoImg = logoDataUrl ? await loadImgCompressed(logoDataUrl, 220, 'jpeg') : null;
  let stampDataUrl = null;
  if (company.stampUrl) {
    const baseUrl = window.location.origin;
    const stampPath = company.stampUrl.startsWith('http') ? company.stampUrl : baseUrl + company.stampUrl;
    stampDataUrl = await loadImgCompressed(stampPath, 200, 'png');
  }

  let y = 0;

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════════════════════════════════
  // Top navy band
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, 5, 'F');
  y = 14;

  // Logo (compressed JPEG — keeps PDF size in KBs)
  if (logoImg) {
    try { doc.addImage(logoImg, 'JPEG', ML, y, 88, 52); } catch (_) {}
  }

  // Company block (right of logo)
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
  const addrParts = [company.address, company.city, company.state, company.pin ? '- ' + company.pin : ''].filter(Boolean);
  if (addrParts.length) { doc.text(addrParts.join(', '), cx, cy2); cy2 += 11; }
  if (company.mobile)   { doc.text('Ph: ' + company.mobile + (company.email ? '   |   ' + company.email : ''), cx, cy2); cy2 += 11; }
  if (company.gst)      { doc.text('GSTIN: ' + company.gst + (company.pan ? '    PAN: ' + company.pan : ''), cx, cy2); }

  y = 76;

  // ── Title band ─────────────────────────────────────────────────────────
  doc.setFillColor(...ORANGE);
  doc.rect(0, y, PW, 26, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  doc.text('DUE BILL  /  PAYMENT REQUEST', PW / 2, y + 17, { align: 'center' });
  y += 34;

  // ── Meta info row ────────────────────────────────────────────────────────
  const metaBoxH = 40; // taller box so long values (e.g. TEMP invoice numbers) can wrap to 2 lines
  doc.setFillColor(...LBLUE);
  doc.setDrawColor(...BLUE);
  doc.setLineWidth(0.5);
  doc.rect(ML, y, MW, metaBoxH, 'FD');

  const metaItems = [
    { label: 'Bill Date',   value: fmtDate(billDate || new Date()) },
    { label: 'Order No.',   value: orderCode || '---' },
    { label: 'Invoice No.', value: invoiceNumber || 'Pending' },
    { label: 'Packed Date', value: fmtDate(packedDate) },
    { label: 'Due Date',    value: data.dueDate ? fmtDate(data.dueDate) : 'On Dispatch' },
  ];
  const mW = MW / metaItems.length;
  metaItems.forEach((m, i) => {
    const mx = ML + i * mW + 5;
    const maxValW = mW - 10; // keep value inside its own column — no overlap
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...NAVY);
    doc.text(m.label, mx, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DGREY);
    // Wrap long values within the column; shrink font if still over 2 lines
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
  y += metaBoxH + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // CUSTOMER + ORDER DETAILS (two columns)
  // ══════════════════════════════════════════════════════════════════════════
  const halfW = (MW - 6) / 2;
  const custFields = [
    ['Name',    customer.name    || '---'],
    ['Mobile',  customer.mobile  || '---'],
    ['Email',   customer.email   || '---'],
    ['Address', [customer.address, customer.city, customer.state].filter(Boolean).join(', ') || '---'],
    ['GSTIN',   customer.gstin   || '---'],
  ];
  const orderFields = [
    ['Order Code',   orderCode      || '---'],
    ['Machine',      machineName    || '---'],
    ['Machine Code', machineCode    || '---'],
    ['Serial No.',   serialNumber   || '---'],
    ['Sale Date',    fmtDate(saleDate)],
  ];
  const lh = 14, boxH = custFields.length * lh + 12;

  // Section headers
  doc.setFillColor(...NAVY);
  doc.rect(ML, y, halfW, 14, 'F');
  doc.rect(ML + halfW + 6, y, halfW, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...WHITE);
  doc.text('CUSTOMER DETAILS',       ML + 6,            y + 9.5);
  doc.text('ORDER & MACHINE DETAILS', ML + halfW + 12,   y + 9.5);
  y += 14;

  // Boxes
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.setFillColor(...WHITE);
  doc.rect(ML, y, halfW, boxH, 'FD');
  doc.rect(ML + halfW + 6, y, halfW, boxH, 'FD');

  custFields.forEach(([lbl, val], i) => {
    const ry = y + 8 + i * lh;
    doc.setFont('helvetica', 'bold');   doc.setFontSize(7.5); doc.setTextColor(...GREY);  doc.text(lbl + ':', ML + 6, ry);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);   doc.setTextColor(...BLACK);
    doc.text(doc.splitTextToSize(String(val), halfW - 72)[0], ML + 68, ry);
  });
  orderFields.forEach(([lbl, val], i) => {
    const ry = y + 8 + i * lh;
    doc.setFont('helvetica', 'bold');   doc.setFontSize(7.5); doc.setTextColor(...GREY);  doc.text(lbl + ':', ML + halfW + 12, ry);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);   doc.setTextColor(...BLACK); doc.text(String(val), ML + halfW + 78, ry);
  });
  y += boxH + 14;

  // ══════════════════════════════════════════════════════════════════════════
  // ITEMS TABLE
  // ══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...BLUE);
  doc.rect(ML, y, MW, 14, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...WHITE);
  doc.text('ORDER ITEMS', ML + 6, y + 9.5);
  y += 14;

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: 36 },
    head: [['#', 'Product / Item Description', 'Qty', 'Unit Price', 'Amount']],
    body: items.map((it, idx) => [
      idx + 1,
      it.productName || '---',
      String(it.quantity || 1),
      fmtAmt(it.unitPrice),
      fmtAmt(it.total)
    ]),
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 5, lineColor: BORDER, lineWidth: 0.4, textColor: BLACK },
    headStyles: { fillColor: LGREY, textColor: BLACK, fontStyle: 'bold', fontSize: 8 },
    footStyles: { fillColor: LGREY, textColor: NAVY,  fontStyle: 'bold' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 24 },
      1: { halign: 'left' },
      2: { halign: 'center', cellWidth: 36 },
      3: { halign: 'right',  cellWidth: 90 },
      4: { halign: 'right',  cellWidth: 95 },
    },
    alternateRowStyles: { fillColor: [250, 250, 255] },
  });
  y = doc.lastAutoTable.finalY + 8;

  // ══════════════════════════════════════════════════════════════════════════
  // GST BREAKDOWN  +  PAYMENT SUMMARY  (side by side)
  // ══════════════════════════════════════════════════════════════════════════
  const gstColW = halfW;           // left column
  const sumX    = ML + gstColW + 6;
  const sumW    = MW - gstColW - 6;

  const isIGST = gstType === 'IGST';
  const gstRows = isIGST
    ? [
        ['Taxable Amount',    fmtAmt(subtotal)],
        ['IGST (18%)',        fmtAmt(taxAmount)],
        ['Total (Incl. GST)', fmtAmt(totalAmount)],
      ]
    : [
        ['Taxable Amount',    fmtAmt(subtotal)],
        ['CGST (9%)',         fmtAmt(taxAmount / 2)],
        ['SGST (9%)',         fmtAmt(taxAmount / 2)],
        ['Total (Incl. GST)', fmtAmt(totalAmount)],
      ];

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: PW - ML - gstColW },
    head: [['GST Calculation', 'Amount']],
    body: gstRows,
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 4.5, lineColor: BORDER, lineWidth: 0.4, textColor: BLACK },
    headStyles: { fillColor: BLUE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 0: { halign: 'left' }, 1: { halign: 'right', cellWidth: 95 } },
    didParseCell(d) {
      if (d.section === 'body' && d.row.index === gstRows.length - 1) {
        d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = LBLUE; d.cell.styles.textColor = NAVY;
      }
    },
  });

  const totalPaid = cmPaid;
  const summaryRows = [
    ['Order Total (Incl. GST)',           fmtAmt(cmTotal)],
    ['Advance Paid (this order)',         fmtAmt(cmAdvance)],
    ['Total Received (Advance + Receipts)', fmtAmt(cmPaid)],
    ['AMOUNT DUE (this order)',           fmtAmt(cmDue)],
  ];
  // Display-only — Additional Charges are already folded into Order Total
  // above (see Order Form). Shown here just so it's visible on the bill,
  // never added again into any of the totals.
  if (additionalCharges > 0) {
    summaryRows.push(['Additional Charges (incl. in Total)', fmtAmt(additionalCharges)]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: sumX, right: 36 },
    head: [['Description', 'Amount']],
    body: summaryRows,
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 4.5, lineColor: BORDER, lineWidth: 0.4, textColor: BLACK },
    headStyles: { fillColor: ORANGE, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
    columnStyles: { 0: { halign: 'left' }, 1: { halign: 'right', cellWidth: 100 } },
    didParseCell(d) {
      if (d.section === 'body') {
        if (d.row.index === 2) { d.cell.styles.textColor = GREEN; d.cell.styles.fontStyle = 'bold'; }
        if (d.row.index === 3) { d.cell.styles.fillColor = LRED;  d.cell.styles.textColor = RED;   d.cell.styles.fontStyle = 'bold'; d.cell.styles.fontSize = 10; }
      }
    },
  });

  y = Math.max(doc.lastAutoTable.finalY, y + 10) + 10;

  // ══════════════════════════════════════════════════════════════════════════
  // AMOUNT IN WORDS
  // ══════════════════════════════════════════════════════════════════════════
  doc.setFillColor(...LRED);
  doc.setDrawColor(...RED);
  doc.setLineWidth(0.6);
  doc.rect(ML, y, MW, 30, 'FD');
  doc.setFont('helvetica', 'bold');  doc.setFontSize(8);  doc.setTextColor(...RED);
  doc.text('Balance Due in Words:', ML + 8, y + 11);
  doc.setFont('helvetica', 'bold');  doc.setFontSize(9);  doc.setTextColor(...BLACK);
  const wordsLine = numberToWords(cmDue);
  doc.text(wordsLine, ML + 8, y + 23, { maxWidth: MW - 16 });
  y += 38;

  // ══════════════════════════════════════════════════════════════════════════
  // ADVANCE PAYMENT HISTORY
  // ══════════════════════════════════════════════════════════════════════════
  if (advancePayments.length > 0) {
    doc.setFillColor(...BLUE);
    doc.rect(ML, y, MW, 14, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...WHITE);
    doc.text('ADVANCE PAYMENT HISTORY', ML + 6, y + 9.5);
    y += 14;

    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: 36 },
      head: [['#', 'Date', 'Mode', 'Transaction ID', 'Remarks', 'Amount']],
      body: advancePayments.map((p, i) => [
        String(i + 1), fmtDate(p.date), p.mode || '---', p.transactionId || '---', p.remarks || '---', fmtAmt(p.amount)
      ]),
      foot: [['', '', '', '', { content: 'Total Advance', styles: { halign: 'right', fontStyle: 'bold' } }, fmtAmt(cmAdvance)]],
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, lineColor: BORDER, lineWidth: 0.4, textColor: BLACK },
      headStyles: { fillColor: LGREY, textColor: BLACK, fontStyle: 'bold', fontSize: 7.5 },
      footStyles: { fillColor: LGREEN, textColor: GREEN, fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'center', cellWidth: 22 }, 5: { halign: 'right', cellWidth: 95 } },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // POST-INVOICE PAYMENTS
  // ══════════════════════════════════════════════════════════════════════════
  if (postInvoicePayments.length > 0) {
    doc.setFillColor(46, 125, 50);
    doc.rect(ML, y, MW, 14, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...WHITE);
    doc.text('PAYMENTS RECEIVED AFTER INVOICE', ML + 6, y + 9.5);
    y += 14;

    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: 36 },
      head: [['#', 'Date', 'Mode', 'Reference No.', 'Notes', 'Amount']],
      body: postInvoicePayments.map((p, i) => [
        String(i + 1), fmtDate(p.date), p.mode || '---', p.referenceNo || '---', p.notes || '---', fmtAmt(p.amount)
      ]),
      foot: [['', '', '', '', { content: 'Total Received', styles: { halign: 'right', fontStyle: 'bold' } }, fmtAmt(paidAmount)]],
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 4, lineColor: BORDER, lineWidth: 0.4, textColor: BLACK },
      headStyles: { fillColor: LGREY, textColor: BLACK, fontStyle: 'bold', fontSize: 7.5 },
      footStyles: { fillColor: LGREEN, textColor: GREEN, fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'center', cellWidth: 22 }, 5: { halign: 'right', cellWidth: 95 } },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER — Stamp (left) + Note (centre) + Authorised Signatory (right)
  // ══════════════════════════════════════════════════════════════════════════
  if (y > PH - 125) { doc.addPage(); y = 36; }
  y = Math.max(y, PH - 118);

  // Divider
  doc.setDrawColor(...NAVY); doc.setLineWidth(1);
  doc.line(ML, y, MR, y);
  y += 8;

  const footH  = 80;
  const stampW = 110;
  const sigW   = 130;

  // ── Stamp box (left) ────────────────────────────────────────────────────
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.5);
  doc.setFillColor(...LGREY);
  doc.rect(ML, y, stampW, footH, 'FD');

  if (stampDataUrl) {
    // embed stamp image inside the box (centred, max 90x70)
    try {
      const imgW = 90, imgH = 70;
      doc.addImage(stampDataUrl, ML + (stampW - imgW) / 2, y + (footH - imgH) / 2, imgW, imgH);
    } catch (_) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...GREY);
      doc.text('Stamp / Seal', ML + stampW / 2, y + footH / 2 + 3, { align: 'center' });
    }
  } else {
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...GREY);
    doc.text('Stamp / Seal', ML + stampW / 2, y + footH / 2 + 3, { align: 'center' });
  }

  // ── Centre note ──────────────────────────────────────────────────────────
  const noteX = ML + stampW + 6;
  const noteW = MW - stampW - 6 - sigW - 6;
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7); doc.setTextColor(...GREY);
  const noteText = 'Please clear the outstanding balance before dispatch.\nThis is a computer-generated due bill.';
  doc.text(noteText, noteX + noteW / 2, y + footH / 2, { align: 'center', maxWidth: noteW });

  // ── Authorised Signatory box (right) ────────────────────────────────────
  const sigX = MR - sigW;
  doc.setFillColor(...LGREY);
  doc.rect(sigX, y, sigW, footH, 'FD');
  doc.setFont('helvetica', 'bold');   doc.setFontSize(7.5); doc.setTextColor(...NAVY);
  doc.text('For ' + (company.name || 'SAMTEK MACHINERY'), sigX + sigW / 2, y + 14, { align: 'center' });
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(...GREY);
  doc.text('Authorised Signatory', sigX + sigW / 2, y + footH - 8, { align: 'center' });

  // ── Bottom navy band ─────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, PH - 5, PW, 5, 'F');

  // ── Page numbers ─────────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GREY);
    doc.text('Page ' + i + ' of ' + totalPages, PW - 36, PH - 8, { align: 'right' });
    doc.text('Due Bill  |  ' + orderCode, ML, PH - 8);
  }

  doc.save('Due-Bill-' + orderCode + '-' + new Date().toISOString().slice(0, 10) + '.pdf');
}
