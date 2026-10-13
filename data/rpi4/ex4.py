import pymupdf
from collections import defaultdict
d = pymupdf.open('datasheet.pdf'); p = d[7]
X0, YB, K = 148.1, 455.1, 56/(455.1-289.3)
segs=[]
for s in p.get_drawings():
    for it in s['items']:
        if it[0]=='c': segs.append((it[1],it[4]))
        if it[0]=='l': pass
# circular holes: curves cluster near hole centers
for cx,cy in [(3.5,3.5),(61.5,3.5),(3.5,52.5),(61.5,52.5)]:
    xs=[];ys=[]
    for s in p.get_drawings():
        for it in s['items']:
            if it[0]=='c':
                pts=[it[1],it[2],it[3],it[4]]
                mx=sum((q.x-X0)*K for q in pts)/4; my=sum((YB-q.y)*K for q in pts)/4
                if abs(mx-cx)<3 and abs(my-cy)<3:
                    xs+= [(q.x-X0)*K for q in pts]; ys+=[(YB-q.y)*K for q in pts]
    if xs: print((cx,cy), 'bbox w', round(max(xs)-min(xs),2), 'h', round(max(ys)-min(ys),2), 'center', round((max(xs)+min(xs))/2,2), round((max(ys)+min(ys))/2,2))
