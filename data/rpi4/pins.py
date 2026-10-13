import pymupdf
d = pymupdf.open('datasheet.pdf')
for i,p in enumerate(d):
    if 'Figure 3: GPIO Connector Pinout' in p.get_text():
        print('page', i)
        p.get_pixmap(dpi=170).save('pinout.png')
        ws = p.get_text('words'); print(len(ws))
        print(' '.join(w[4] for w in ws if 300 < w[1] < 520)[:1500])
