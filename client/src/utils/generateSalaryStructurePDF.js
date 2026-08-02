import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const NAVY = [13, 71, 161];
const ORANGE = [200, 75, 0];
const LGREY = [245, 245, 245];
const GREY = [80, 80, 80];
const BORDER = [180, 180, 180];
const WHITE = [255, 255, 255];
const GREEN = [27, 94, 32];
const RED = [183, 28, 28];

function fmtDate(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('en-GB');
  } catch (_) {
    return '-';
  }
}

function nameOf(ref) {
  if (!ref) return '-';
  return typeof ref === 'object' ? (ref.name || '-') : ref;
}

/**
 * Exports the Salary Structure table exactly as shown on screen — same
 * columns, same rows, same Grand Total footer — to a landscape A4 PDF.
 *
 * @param {Array} salaryList — the list currently rendered in the table
 * @param {string} companyLabel — optional heading (e.g. selected company filter)
 */
export function generateSalaryStructurePDF(salaryList = [], companyLabel = '') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const ML = 24, MR = PW - 24, MW = MR - ML;

  const companyName = companyLabel || 'All Companies';

  let y = 24;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PW, 4, 'F');
  y += 18;

  // Company name — prominent, top of the page
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text(companyName, ML, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GREY);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-GB')}`, MR, y, { align: 'right' });
  y += 16;

  // Subtitle band
  doc.setFillColor(...ORANGE);
  doc.rect(ML, y, MW, 18, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...WHITE);
  doc.text('SALARY STRUCTURE REPORT', ML + MW / 2, y + 12.5, { align: 'center' });
  y += 18 + 12;

  const calcTotalEarnings = (s) => (s.basic || 0) + (s.hra || 0) + (s.otherAllowance || 0);
  const calcTotalDeductions = (s) =>
    (s.pf || 0) + (s.professionalTax || 0) + (s.tds || 0) + (s.advance || 0) + (s.others || 0);
  const calcNetSalary = (s) => calcTotalEarnings(s) - calcTotalDeductions(s);

  const head = [[
    'No.', 'Employee ID', 'Employee Name', 'Designation', 'Department', 'DOJ', 'Location',
    'Basic', 'HRA', 'Other Allw.', 'Total Earn.',
    'Emp PF', 'Prof. Tax', 'TDS', 'Advance', 'Others', 'Total Deduct.',
    'Net Salary Payable',
  ]];

  const body = salaryList.map((s, i) => [
    String(i + 1),
    s.employee?.employeeId || '-',
    s.employee?.fullName || 'Unknown',
    nameOf(s.employee?.designationId),
    nameOf(s.employee?.departmentId),
    fmtDate(s.employee?.joiningDate),
    nameOf(s.employee?.branchId),
    (s.basic || 0).toLocaleString('en-IN'),
    (s.hra || 0).toLocaleString('en-IN'),
    (s.otherAllowance || 0).toLocaleString('en-IN'),
    calcTotalEarnings(s).toLocaleString('en-IN'),
    (s.pf || 0).toLocaleString('en-IN'),
    (s.professionalTax || 0).toLocaleString('en-IN'),
    (s.tds || 0).toLocaleString('en-IN'),
    (s.advance || 0).toLocaleString('en-IN'),
    (s.others || 0).toLocaleString('en-IN'),
    calcTotalDeductions(s).toLocaleString('en-IN'),
    calcNetSalary(s).toLocaleString('en-IN'),
  ]);

  const sum = (fn) => salaryList.reduce((acc, s) => acc + fn(s), 0);
  const grandRow = [
    { content: 'Grand Total', colSpan: 7, styles: { halign: 'right', fontStyle: 'bold' } },
    sum((s) => s.basic || 0).toLocaleString('en-IN'),
    sum((s) => s.hra || 0).toLocaleString('en-IN'),
    sum((s) => s.otherAllowance || 0).toLocaleString('en-IN'),
    sum(calcTotalEarnings).toLocaleString('en-IN'),
    sum((s) => s.pf || 0).toLocaleString('en-IN'),
    sum((s) => s.professionalTax || 0).toLocaleString('en-IN'),
    sum((s) => s.tds || 0).toLocaleString('en-IN'),
    sum((s) => s.advance || 0).toLocaleString('en-IN'),
    sum((s) => s.others || 0).toLocaleString('en-IN'),
    sum(calcTotalDeductions).toLocaleString('en-IN'),
    sum(calcNetSalary).toLocaleString('en-IN'),
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: 24 },
    head,
    body: body.length
      ? [...body, grandRow]
      : [[{ content: 'No salary structure records found', colSpan: 18, styles: { halign: 'center', textColor: GREY } }]],
    styles: { font: 'helvetica', fontSize: 6.5, cellPadding: 4, lineColor: BORDER, lineWidth: 0.3, textColor: [20, 20, 20] },
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 6.5, halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 22 },
      1: { halign: 'center' },
      7: { halign: 'right' }, 8: { halign: 'right' }, 9: { halign: 'right' },
      10: { halign: 'right', fontStyle: 'bold', textColor: GREEN },
      11: { halign: 'right' }, 12: { halign: 'right' }, 13: { halign: 'right' }, 14: { halign: 'right' }, 15: { halign: 'right' },
      16: { halign: 'right', fontStyle: 'bold', textColor: RED },
      17: { halign: 'right', fontStyle: 'bold', textColor: NAVY },
    },
    alternateRowStyles: { fillColor: [250, 250, 255] },
    didParseCell: (data) => {
      // Style the appended Grand Total row distinctly
      if (body.length && data.row.index === body.length) {
        data.cell.styles.fillColor = LGREY;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GREY);
    doc.text(`Page ${i} of ${totalPages}`, MR, PH - 10, { align: 'right' });
    doc.text(`${companyName}  |  Salary Structure Report`, ML, PH - 10);
    doc.setFillColor(...ORANGE);
    doc.rect(0, PH - 4, PW, 4, 'F');
  }

  doc.save(`Salary-Structure-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default generateSalaryStructurePDF;
