const PDFDocument = require('pdfkit');

// Generates a landscape A4 "Player of the Match" certificate as a PDF Buffer,
// styled after a classic internship-certificate layout: bordered card,
// logo block top-right, cursive recipient name, body paragraph, two
// signature blocks at the bottom.
function generateMotmCertificate({
  playerName,
  teamAName,
  teamBName,
  statLine,
  matchDate,
  awardType = 'Player of the Match',
}) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Background
    doc.rect(0, 0, pageWidth, pageHeight).fill('#f6f5f0');

    // Faint cricket-ball watermark, center-ish (purely decorative).
    doc.save();
    doc.opacity(0.06);
    doc.circle(pageWidth / 2, pageHeight / 2, 160).fill('#1a1a2e');
    doc.opacity(1);
    doc.restore();

    // Outer border
    doc.lineWidth(2).strokeColor('#1a1a2e').rect(24, 24, pageWidth - 48, pageHeight - 48).stroke();
    doc.lineWidth(0.75).strokeColor('#22c55e').rect(32, 32, pageWidth - 64, pageHeight - 64).stroke();

    // Top row: issued date + match line
    doc.fillColor('#666').fontSize(10).font('Helvetica-Oblique');
    doc.text(`Issued Date: ${matchDate}`, 55, 46);
    doc.text(`${teamAName} vs ${teamBName}`, pageWidth - 320, 46, { width: 265, align: 'right' });

    // Logo block (top right) — text-based PollVerse mark, matching the
    // app's existing ⚡ branding rather than an external image asset.
    doc.fillColor('#16a34a').font('Helvetica-Bold').fontSize(22);
    doc.text('⚡ PollVerse', pageWidth - 280, 68, { width: 225, align: 'right' });
    doc.fillColor('#999').font('Helvetica').fontSize(9);
    doc.text('GULLY CRICKET', pageWidth - 280, 95, { width: 225, align: 'right' });

    // Divider line between title block and logo block
    doc.moveTo(pageWidth - 300, 60).lineTo(pageWidth - 300, 110).lineWidth(1).strokeColor('#ccc').stroke();

    // Title
    doc.fillColor('#1a1a2e').font('Helvetica-Bold').fontSize(46);
    doc.text('CERTIFICATE', 55, 85);
    doc.font('Helvetica').fontSize(19).fillColor('#333');
    doc.text(`OF ${awardType.toUpperCase()}`, 55, 140);

    // Recipient name — the whole point of the certificate.
    doc.font('Helvetica-BoldOblique').fontSize(38).fillColor('#16a34a');
    doc.text(playerName, 55, 215);
    doc.moveTo(55, 262).lineTo(430, 262).lineWidth(1).strokeColor('#333').stroke();

    // Body paragraph
    doc.font('Helvetica').fontSize(13).fillColor('#222');
    doc.text(
      `For being awarded ${awardType} for an outstanding performance of ${statLine} in the match between ` +
        `${teamAName} and ${teamBName}, played on ${matchDate}. This certificate recognizes exceptional skill, ` +
        `contribution, and sportsmanship on the field.`,
      55,
      290,
      { width: pageWidth - 350, lineGap: 5 }
    );

    // Signature blocks
    const sigY = pageHeight - 130;

    doc.font('Helvetica-Oblique').fontSize(16).fillColor('#333');
    doc.text('Devansh Upadhyay', 55, sigY - 26);
    doc.moveTo(55, sigY).lineTo(230, sigY).lineWidth(1).strokeColor('#333').stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a1a2e');
    doc.text('Devansh Upadhyay', 55, sigY + 8);
    doc.font('Helvetica').fontSize(9).fillColor('#666');
    doc.text('Founder, PollVerse', 55, sigY + 22);

    doc.font('Helvetica').fontSize(22).fillColor('#f59e0b');
    doc.text('🏆', 420, sigY - 30);
    doc.moveTo(420, sigY).lineTo(595, sigY).lineWidth(1).strokeColor('#333').stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a1a2e');
    doc.text(awardType, 420, sigY + 8);
    doc.font('Helvetica').fontSize(9).fillColor('#666');
    doc.text('Awarded By PollVerse', 420, sigY + 22);

    // Footer note
    doc.font('Helvetica').fontSize(8).fillColor('#999');
    doc.text('Generated automatically by PollVerse — Gully Cricket Live Scoring', 55, pageHeight - 45);

    doc.end();
  });
}

module.exports = { generateMotmCertificate };