"""Render the Praça vector mark to browser icon formats without external services."""
from PIL import Image,ImageDraw
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]/'public'
scale=16
im=Image.new('RGBA',(64*scale,64*scale))
draw=ImageDraw.Draw(im)
def p(x,y):return x*scale,y*scale
draw.rounded_rectangle((0,0,64*scale-1,64*scale-1),radius=14*scale,fill='#244e35')
def stroke(points,color,width):
 pts=[p(x,y) for x,y in points];draw.line(pts,fill=color,width=int(width*scale),joint='curve')
 for x,y in pts:
  r=width*scale/2;draw.ellipse((x-r,y-r,x+r,y+r),fill=color)
def curve(a,b,c,e):
 return [((1-t)**3*a[0]+3*(1-t)**2*t*b[0]+3*(1-t)*t*t*c[0]+t**3*e[0],(1-t)**3*a[1]+3*(1-t)**2*t*b[1]+3*(1-t)*t*t*c[1]+t**3*e[1]) for t in [i/120 for i in range(121)]]
stroke([(17,47),(38,26)],'#f5f1e8',5)
stroke(curve((20,42),(13,29),(24,13),(44,14))+curve((44,14),(49,32),(42,45),(24,44))[1:],'#f5f1e8',5)
stroke([(28,36),(38,36)],'#f0c64b',4);stroke([(33,30),(33,20)],'#f0c64b',4)
for size,name in [(16,'favicon-16.png'),(32,'favicon-32.png'),(180,'apple-touch-icon.png'),(192,'icon-192.png'),(512,'icon-512.png')]:im.resize((size,size),Image.Resampling.LANCZOS).save(root/name)
im.save(root/'favicon.ico',sizes=[(16,16),(32,32),(48,48)])
mask=Image.new('RGBA',(512,512),'#244e35');mask.alpha_composite(im.resize((360,360),Image.Resampling.LANCZOS),(76,76));mask.convert('RGB').save(root/'icon-maskable-512.png')
manifest={'id':'/','name':'Praça','short_name':'Praça','lang':'pt-BR','description':'Publique ideias, encontre pessoas e cuide do espaço comum.','start_url':'/','scope':'/','display':'standalone','background_color':'#f5f1e8','theme_color':'#244e35','icons':[{'src':'/icon-192.png','sizes':'192x192','type':'image/png','purpose':'any'},{'src':'/icon-512.png','sizes':'512x512','type':'image/png','purpose':'any'},{'src':'/icon-maskable-512.png','sizes':'512x512','type':'image/png','purpose':'maskable'}],'shortcuts':[{'name':'Mural','url':'/mural'},{'name':'Escrever','url':'/escrever'},{'name':'Conexões','url':'/conexoes'}]}
(root/'manifest.webmanifest').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
