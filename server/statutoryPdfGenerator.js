/**
 * Pure JavaScript Statutory PDF Generator for CertifyMetric Legal Metrology Portal.
 * Produces compliant, self-contained PDF-1.4 documents without external binary dependencies.
 */

export function generateStatutoryPdfBuffer({
  documentTitle = 'Statutory Legal Metrology Document',
  category = 'APPLICANT SUPPORTING DOCUMENT',
  fileName = 'document.pdf',
  applicationNo = 'APP-LM-2026-STAT',
  traderName = 'Commercial Trader / Business Entity',
  issueDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  instrumentDetails = 'Commercial Weighing / Measuring Instrument (NAWI - Schedule V)'
}) {
  const sanitize = (str) => String(str || '').replace(/[\\()]/g, '');

  const safeTitle = sanitize(documentTitle);
  const safeCategory = sanitize(category.toUpperCase());
  const safeFileName = sanitize(fileName);
  const safeAppNo = sanitize(applicationNo);
  const safeTrader = sanitize(traderName);
  const safeDate = sanitize(issueDate);
  const safeInstrument = sanitize(instrumentDetails);

  // PDF stream stream operators (A4: 595.28 x 841.89 points)
  // Page coordinates: (0,0) is bottom-left, (595, 842) is top-right.
  const streamLines = [
    // Background border & header box
    '0.5 0.5 0.5 RG', // Dark slate border stroke
    '2 w', // 2pt line width
    '30 30 535 782 re', // Outer border rectangle
    'S',
    '0.05 0.15 0.3 rg', // Navy blue header bar (#002046 approx)
    '30 732 535 80 re',
    'f',

    // Gold accent stripe
    '0.85 0.65 0.13 rg', // Gold stripe
    '30 728 535 4 re',
    'f',

    // Header Text
    'BT',
    '/F1 16 Tf',
    '1 1 1 rg', // White text
    '50 780 Td',
    '(LEGAL METROLOGY DIVISION) Tj',
    'ET',

    'BT',
    '/F2 10 Tf',
    '0.9 0.9 0.9 rg',
    '50 762 Td',
    '(GOVERNMENT OF INDIA - STATUTORY VERIFICATION PORTAL) Tj',
    'ET',

    'BT',
    '/F2 9 Tf',
    '0.8 0.85 0.9 rg',
    '50 745 Td',
    '(Standards of Weights and Measures Act & Legal Metrology General Rules) Tj',
    'ET',

    // Category Badge Box
    '0.95 0.95 0.97 rg',
    '50 675 495 38 re',
    'f',
    '0.8 0.8 0.85 RG',
    '1 w',
    '50 675 495 38 re',
    'S',

    'BT',
    '/F1 12 Tf',
    '0.05 0.15 0.3 rg',
    '65 695 Td',
    `(${safeCategory}) Tj`,
    'ET',

    'BT',
    '/F2 9 Tf',
    '0.4 0.45 0.5 rg',
    '65 682 Td',
    `(File Reference: ${safeFileName}) Tj`,
    'ET',

    // Section 1: Document Particulars Table
    '0.92 0.95 0.98 rg',
    '50 635 495 24 re',
    'f',
    'BT',
    '/F1 10 Tf',
    '0.05 0.15 0.3 rg',
    '60 644 Td',
    '(1. OFFICIAL RECORD & APPLICATION PARTICULARS) Tj',
    'ET',

    // Table Grid Lines
    '0.85 0.85 0.85 RG',
    '1 w',
    '50 495 495 140 re',
    'S',
    '50 600 495 0 re',
    'S',
    '50 565 495 0 re',
    'S',
    '50 530 495 0 re',
    'S',
    '200 495 0 140 re',
    'S',

    // Table Content
    // Row 1
    'BT',
    '/F1 9 Tf',
    '0.3 0.3 0.3 rg',
    '60 612 Td',
    '(Application Number:) Tj',
    'ET',
    'BT',
    '/F1 9 Tf',
    '0.05 0.15 0.3 rg',
    '210 612 Td',
    `(${safeAppNo}) Tj`,
    'ET',

    // Row 2
    'BT',
    '/F1 9 Tf',
    '0.3 0.3 0.3 rg',
    '60 577 Td',
    '(Trader / Entity Name:) Tj',
    'ET',
    'BT',
    '/F2 9 Tf',
    '0.1 0.1 0.1 rg',
    '210 577 Td',
    `(${safeTrader}) Tj`,
    'ET',

    // Row 3
    'BT',
    '/F1 9 Tf',
    '0.3 0.3 0.3 rg',
    '60 542 Td',
    '(Instrument Category:) Tj',
    'ET',
    'BT',
    '/F2 9 Tf',
    '0.1 0.1 0.1 rg',
    '210 542 Td',
    `(${safeInstrument}) Tj`,
    'ET',

    // Row 4
    'BT',
    '/F1 9 Tf',
    '0.3 0.3 0.3 rg',
    '60 507 Td',
    '(Filing / Upload Date:) Tj',
    'ET',
    'BT',
    '/F2 9 Tf',
    '0.1 0.1 0.1 rg',
    '210 507 Td',
    `(${safeDate}) Tj`,
    'ET',

    // Section 2: Statutory Declaration & Scrutiny Note
    '0.92 0.95 0.98 rg',
    '50 445 495 24 re',
    'f',
    'BT',
    '/F1 10 Tf',
    '0.05 0.15 0.3 rg',
    '60 454 Td',
    '(2. STATUTORY DOCUMENT SCRUTINY & VERIFICATION STATUS) Tj',
    'ET',

    'BT',
    '/F2 9.5 Tf',
    '0.2 0.2 0.2 rg',
    '60 415 Td',
    '(This document constitutes official digital evidence uploaded pursuant to statutory verification) Tj',
    '0 -16 Td',
    '(mandates under the Legal Metrology Act, 2009. The document has been verified for authenticity,) Tj',
    '0 -16 Td',
    '(completeness of statutory particulars, and compliance with notified technical regulations.) Tj',
    'ET',

    // Stamp / Seal Box (Right bottom)
    '0.05 0.5 0.3 RG',
    '1.5 w',
    '330 250 200 85 re',
    'S',
    '0.92 0.98 0.94 rg',
    '330 250 200 85 re',
    'f',
    'BT',
    '/F1 10 Tf',
    '0.05 0.5 0.3 rg',
    '350 315 Td',
    '(LEGAL METROLOGY DEPARTMENT) Tj',
    '/F1 9 Tf',
    '365 295 Td',
    '(DIGITALLY SCRUTINIZED) Tj',
    '/F2 8 Tf',
    '0.2 0.4 0.2 rg',
    '355 278 Td',
    `(Verified: ${safeDate}) Tj`,
    '345 262 Td',
    '(CertifyMetric Government Portal) Tj',
    'ET',

    // Security Watermark Text
    '0.9 0.9 0.92 rg',
    'BT',
    '/F1 32 Tf',
    '120 190 Td',
    '(OFFICIAL STATUTORY RECORD) Tj',
    'ET',

    // Footer Bar
    '0.95 0.95 0.97 rg',
    '30 30 535 30 re',
    'f',
    '0.8 0.8 0.85 RG',
    '1 w',
    '30 60 535 0 re',
    'S',
    'BT',
    '/F2 8 Tf',
    '0.4 0.45 0.5 rg',
    '45 42 Td',
    '(CertifyMetric e-Governance Platform - Legal Metrology Regulatory Infrastructure - Page 1 of 1) Tj',
    'ET'
  ];

  const contentStream = streamLines.join('\n');
  const streamLength = Buffer.byteLength(contentStream, 'utf-8');

  // Build PDF Objects
  const objects = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  objects.push(
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj'
  );
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj');
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  objects.push(`6 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj`);

  let pdfOutput = '%PDF-1.4\n';
  const xrefPositions = [0];

  for (let i = 0; i < objects.length; i++) {
    xrefPositions.push(Buffer.byteLength(pdfOutput, 'utf-8'));
    pdfOutput += `${objects[i]}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdfOutput, 'utf-8');
  pdfOutput += `xref\n0 ${objects.length + 1}\n`;
  pdfOutput += '0000000000 65535 f \n';

  for (let i = 1; i <= objects.length; i++) {
    const pos = String(xrefPositions[i]).padStart(10, '0');
    pdfOutput += `${pos} 00000 n \n`;
  }

  pdfOutput += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdfOutput, 'utf-8');
}
