import pymupdf, json
d = pymupdf.open('datasheet.pdf'); p = d[7]
dr = p.get_drawings()
# board outline = largest rect-ish path ~ 85x56 ratio
rects = []
for s in dr:
    r = s['rect']
    if r.width < 1 or r.height < 1: continue
    rects.append((r.x0, r.y0, r.x1, r.y1, len(s['items']), s.get('fill'), s.get('width')))
# find the board: width/height ratio 85/56
best = None
for x0,y0,x1,y1,n,f,w in rects:
    W,H = x1-x0, y1-y0
    if abs(W/H - 85/56) < 0.02 and W > 200: best = (x0,y0,x1,y1)
print('board', best)
x0,y0,x1,y1 = best; k = 85/(x1-x0); print('pt/mm', 1/k, 'H mm', (y1-y0)*k)
out = []
for a,b,c,e,n,f,w in rects:
    W,H = (c-a)*k, (e-b)*k
    if 2.5 < W < 40 and 2.5 < H < 40 and n <= 8:
        out.append((round((a-x0)*k,2), round((y1-e)*k,2), round(W,2), round(H,2), n))
out.sort()
for o in out: print(o)
print('words', [(w[4], round((w[0]-x0)*k,1), round((y1-w[3])*k,1)) for w in p.get_text('words') if 'Z' in w[4]])
