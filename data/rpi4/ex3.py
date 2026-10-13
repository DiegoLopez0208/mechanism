import pymupdf, json
d = pymupdf.open('datasheet.pdf'); p = d[7]
X0, YB, K = 148.1, 455.1, 56/(455.1-289.3)   # mm per pt, calibrado con 85x56
segs = []
for s in p.get_drawings():
    for it in s['items']:
        if it[0]=='l': segs.append((it[1], it[2]))
        elif it[0]=='re':
            r=it[1]; c=[(r.x0,r.y0),(r.x1,r.y0),(r.x1,r.y1),(r.x0,r.y1)]
            for i in range(4): segs.append((pymupdf.Point(*c[i]), pymupdf.Point(*c[(i+1)%4])))
        elif it[0]=='qu':
            q=it[1]; c=[q.ul,q.ur,q.lr,q.ll]
            for i in range(4): segs.append((c[i], c[(i+1)%4]))
print('segs', len(segs))
par = list(range(len(segs)))
def f(a):
    while par[a]!=a: par[a]=par[par[a]]; a=par[a]
    return a
from collections import defaultdict
pts = defaultdict(list)
for i,(a,b) in enumerate(segs):
    for q in (a,b): pts[(round(q.x/0.15), round(q.y/0.15))].append(i)
for v in pts.values():
    for j in v[1:]: par[f(j)] = f(v[0])
groups = defaultdict(list)
for i in range(len(segs)): groups[f(i)].append(i)
out=[]
for g in groups.values():
    xs=[q.x for i in g for q in segs[i]]; ys=[q.y for i in g for q in segs[i]]
    x0,x1,y0,y1=min(xs),max(xs),min(ys),max(ys)
    w,h=(x1-x0)*K,(y1-y0)*K
    if 2.5<w<60 and 2.5<h<60 and len(g)>=4:
        out.append((round((x0-X0)*K,2), round((YB-y1)*K,2), round(w,2), round(h,2), len(g)))
out.sort()
for o in out: print(o)
