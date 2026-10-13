import cv2, numpy as np, json
def body_box(img, x0, x1, y0, y1):
    # silueta del telefono en la vista trasera: lo que difiere del fondo blanco
    g = cv2.cvtColor(img[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY); m = (g < 245).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9,9),np.uint8)); cs,_ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    c = max(cs, key=cv2.contourArea); x,y,w,h = cv2.boundingRect(c); return x+x0, y+y0, w, h
def circles(img, box, rmin, rmax, dark=70):
    x,y,w,h = box; g = cv2.cvtColor(img[y:y+h, x:x+w], cv2.COLOR_BGR2GRAY); g = cv2.medianBlur(g, 5)
    cs = cv2.HoughCircles(g, cv2.HOUGH_GRADIENT, dp=1.2, minDist=18, param1=90, param2=26, minRadius=rmin, maxRadius=rmax)
    out=[]
    if cs is not None:
        for cx,cy,r in cs[0]:
            patch = g[max(0,int(cy-r*0.5)):int(cy+r*0.5), max(0,int(cx-r*0.5)):int(cx+r*0.5)]
            if patch.size and patch.mean() < dark: out.append((float(cx),float(cy),float(r)))
    return out
for name, path, crop, W, Hh in [('poco','xiaomi-poco-x8-pro-max-1.jpg',(355,670,50,700),77.9,162.9), ('s26','s26-1.jpg',(355,672,0,625),78.1,163.6)]:
    img = cv2.imread(path); box = body_box(img, *crop); x,y,w,h = box
    sx, sy = W/w, Hh/h
    print(name, 'caja', box, 'mm/px x', round(sx,4), 'y', round(sy,4), ' (consistencia x vs y:', round(sx/sy,3), ')')
    cs = circles(img, box, 12, 45)
    cs = sorted(cs, key=lambda c:(c[0]>w*0.5, c[1]))
    for cx,cy,r in cs: print('  lente   x_mm %.1f  y_mm(desde arriba) %.1f  diametro_mm %.1f' % (cx*sx, cy*sy, 2*r*sx))
