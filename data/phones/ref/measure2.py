import cv2, numpy as np
def silhouette(img, crop):
    x0,x1,y0,y1 = crop; g = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY); m = (g < 246).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((7,7),np.uint8)); cs,_ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); c = max(cs, key=cv2.contourArea)
    mask = np.zeros_like(m); cv2.drawContours(mask, [c], -1, 1, -1); return mask
def corner_radius(mask):
    ys,xs = np.nonzero(mask); x0,x1,y0,y1 = xs.min(), xs.max(), ys.min(), ys.max(); rs=[]
    for corner,(sx,sy) in {'TL':(1,1),'TR':(-1,1),'BL':(1,-1),'BR':(-1,-1)}.items():
        best=None
        for r in range(8, 110):
            err=0; n=0
            for k in range(0, r, 2):
                row = y0+k if sy>0 else y1-k
                cols = np.nonzero(mask[row])[0]
                edge = cols.min()-x0 if sx>0 else x1-cols.max()
                expect = r - np.sqrt(max(0, r*r-(r-k)**2)); err += (edge-expect)**2; n+=1
            err/=max(1,n)
            if best is None or err<best[0]: best=(err,r)
        rs.append(best[1])
    return rs, (x1-x0+1, y1-y0+1)
for name,path,crop,W in [('poco_back','xiaomi-poco-x8-pro-max-1.jpg',(355,670,50,700),77.9),('poco_front','xiaomi-poco-x8-pro-max-1.jpg',(40,355,50,700),77.9),('s26_back','s26-1.jpg',(355,672,0,625),78.1),('s26_front','s26-1.jpg',(50,350,0,625),78.1)]:
    img=cv2.imread(path); mask=silhouette(img,crop); rs,(w,h)=corner_radius(mask); s=W/w
    print(name, 'caja px',(w,h),'radios px',rs,'-> mm',[round(r*s,1) for r in rs])
