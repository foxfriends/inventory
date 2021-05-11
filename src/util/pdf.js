const PDF = require('pdfkit');
const path = require('path');

const printAddresses = (addresses, returnAddress) => {
  if (addresses.length === 0) {
    throw new Error('No orders were found');
  }
  const width = 7 * 72;
  const height = 5 * 72;
  const pdf = new PDF({
    size: [width, height],
    autoFirstPage: false,
    margin: 0,
  });
  pdf.font(path.join(__dirname, '../../res/Montserrat-Medium.ttf'));
  for (const address of addresses) {
    const [name, ...lines] = address.split('\n');
    const options = { width, align: 'left' };
    const NAME_SIZE = 21;

    pdf.fontSize(NAME_SIZE);
    const nh = pdf.heightOfString(name, options);
    const nw = pdf.widthOfString(name, options);

    pdf.addPage();
    pdf.fontSize(12);
    const h = nh + pdf.heightOfString(...lines.join('\n'), options);
    const w = Math.max(nw, ...lines.map((line) => pdf.widthOfString(line, options)));

    pdf.fontSize(NAME_SIZE);
    pdf.text(name, (width - w) / 2, (height - h) / 2, options);
    pdf.fontSize(12);
    pdf.text(lines.join('\n'), (width - w) / 2, (height - h) / 2 + nh, options);
    pdf.fontSize(10);
    pdf.text(returnAddress.trim(), 50, 50, options);
  }
  pdf.end();
  return pdf;
};

module.exports = { printAddresses };
