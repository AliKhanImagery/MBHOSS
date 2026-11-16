# Generates synthetic test documents (NOT MBH's real letterhead).
import io, sys
from docx import Document
from docx.shared import Inches
from PIL import Image

def logo():
    b = io.BytesIO(); Image.new('RGB', (60, 30), (20, 60, 120)).save(b, 'PNG'); b.seek(0); return b

d = Document()
h = d.sections[0].header
h.paragraphs[0].add_run().add_picture(logo(), width=Inches(1))
h.add_paragraph('Test Industries (Pvt) Ltd')
h.add_paragraph('12 Example Road, Sample City')
f = d.sections[0].footer
f.paragraphs[0].text = 'Tel: 000-0000000 | info@example.test'
d.add_paragraph('QUOTATION')
d.add_paragraph('Ref: TI/Q/2026/001')
d.add_paragraph('Date: 01 January 2026')
d.add_paragraph('To: Sample Client')
t = d.add_table(rows=2, cols=3)
for i, c in enumerate(['Item', 'Qty', 'Price']): t.rows[0].cells[i].text = c
for i, c in enumerate(['Widget', '1', '100']): t.rows[1].cells[i].text = c
d.add_paragraph('Total payable is exclusive of GST and all other applicable taxes.')
d.add_paragraph('Terms & Conditions:')
d.add_paragraph('1. Delivery within 4 weeks from the date of order.')
d.add_paragraph('2. Payment: 50% advance, balance before dispatch.')
d.add_paragraph('3. Prices are valid for 30 days.')
d.add_paragraph('Best Regards,')
d.add_paragraph('For Test Industries (Pvt) Ltd')
d.add_paragraph('Jane Example')
d.add_paragraph('Sales Manager')
d.save('tests/fixtures/sample-quotation.docx')

e = Document(); e.add_paragraph('Just a plain note with no letterhead.'); e.save('tests/fixtures/plain.docx')
