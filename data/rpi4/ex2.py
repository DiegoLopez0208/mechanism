import pymupdf
d = pymupdf.open('datasheet.pdf'); p = d[7]
print(p.rect)
dr = p.get_drawings()
big = sorted([(round(s['rect'].width,1), round(s['rect'].height,1), round(s['rect'].x0,1), round(s['rect'].y0,1), len(s['items'])) for s in dr], reverse=True)[:25]
for b in big: print(b)
