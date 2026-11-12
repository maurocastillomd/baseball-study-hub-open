"""Render original lesson diagrams as desktop/mobile SVG assets. No browser needed."""
from pathlib import Path
import html, json, math, re
from PIL import ImageFont
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'app/assets/lesson-graphics'
OUT.mkdir(parents=True,exist_ok=True)
COLORS={'ink':'#202725','muted':'#596660','blue':'#286149','wash':'#EAF2ED','line':'#DBE1DD','paper':'#F7F7F4','white':'#FFFFFF'}
FONT=Path('/System/Library/Fonts/Supplemental/Arial.ttf')
assert FONT.exists(),'Expected local Arial font for width verification'
def esc(s):return html.escape(str(s),quote=True)
def font(size):return ImageFont.truetype(str(FONT),size)
def width(s,size):return font(size).getlength(s)
def wrap(s,size,max_width):
    words=str(s).split();lines=[];line=''
    for word in words:
        assert width(word,size)<=max_width, f'Unbreakable label {word!r}'
        trial=f'{line} {word}'.strip()
        if line and width(trial,size)>max_width:lines.append(line);line=word
        else:line=trial
    return lines+[line] if line else lines
class SVG:
    def __init__(self,w,title,alt): self.w=w;self.title=title;self.alt=alt;self.parts=[];self.boxes=[]
    def rect(self,x,y,w,h,fill='white',stroke='line',rx=16):
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{COLORS.get(fill,fill)}" stroke="{COLORS.get(stroke,stroke)}"/>')
    def text(self,lines,x,y,size=20,fill='ink',weight='400',lineheight=None,anchor='start'):
        if isinstance(lines,str):lines=[lines]
        step=lineheight or size*1.3
        self.parts.append(f'<text x="{x}" y="{y}" fill="{COLORS[fill]}" font-family="Arial, Helvetica, sans-serif" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}">')
        for i,line in enumerate(lines):
            self.parts.append(f'<tspan x="{x}" dy="{0 if i==0 else step}">{esc(line)}</tspan>')
            tw=width(line,size)*(1.06 if weight=='700' else 1)
            left=x-(tw/2 if anchor=='middle' else tw if anchor=='end' else 0)
            self.boxes.append((left,y+i*step-size,tw,size*1.3,line))
        self.parts.append('</text>')
    def arrow(self,start,end,dashed=False):
        x1,y1=start;x2,y2=end
        self.parts.append(f'<path d="M{x1} {y1} L{x2} {y2}" stroke="{COLORS["blue"]}" stroke-width="2.5" fill="none"{(" stroke-dasharray=\"6 5\"" if dashed else "")}/>')
        a=math.atan2(y2-y1,x2-x1);length=10;spread=.52
        pts=[(x2,y2),(x2-length*math.cos(a-spread),y2-length*math.sin(a-spread)),(x2-length*math.cos(a+spread),y2-length*math.sin(a+spread))]
        self.parts.append('<polygon points="'+' '.join(f'{x:.2f},{y:.2f}' for x,y in pts)+f'" fill="{COLORS["blue"]}"/>')
    def finish(self,h):
        for x,y,w,th,label in self.boxes:
            assert x>=-1 and x+w<=self.w+1 and y>=-1 and y+th<=h+1,(self.title,label,'text beyond SVG',x,y,w,th,self.w,h)
        return f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{h}" viewBox="0 0 {self.w} {h}" role="img" aria-labelledby="graphic-title graphic-description"><title id="graphic-title">{esc(self.title)}</title><desc id="graphic-description">{esc(self.alt)}</desc><rect width="100%" height="100%" fill="{COLORS["paper"]}"/>'+''.join(self.parts)+'</svg>\n'

def node_graph(g,mobile):
    nodes=g['nodes'];n=len(nodes);w=400 if mobile else 900;pad=24;gap=42
    if mobile:cols=1
    elif g['type']=='cycle':cols=2
    else:cols=3 if n in (3,5) else 2
    cardw=(w-pad*2-gap*(cols-1))/cols
    labelsize=24;bodysize=20;inner=cardw-38
    layouts=[]
    for nd in nodes:
        lab=wrap(nd['label'],labelsize,inner-6);detail=wrap(nd['detail'],bodysize,inner)
        layouts.append((lab,detail,94+len(lab)*30+len(detail)*26))
    cardh=max(x[2] for x in layouts)
    rows=math.ceil(n/cols);h=pad*2+rows*cardh+(rows-1)*gap
    if g['type']=='cycle':h+=24
    svg=SVG(w,g['title'],g['alt']);positions=[]
    for i,(nd,(lab,detail,_)) in enumerate(zip(nodes,layouts)):
        row=i//cols;col=i%cols
        if row%2:col=cols-1-col
        x=pad+col*(cardw+gap);y=pad+row*(cardh+gap);positions.append((x,y))
        svg.rect(x,y,cardw,cardh)
        svg.rect(x+18,y+17,34,26,fill='blue',stroke='blue',rx=7)
        svg.text(str(i+1),x+35,y+36,16,fill='white',weight='700',anchor='middle')
        svg.text(lab,x+19,y+74,labelsize,weight='700',lineheight=30)
        svg.text(detail,x+19,y+88+len(lab)*30,bodysize,fill='muted',lineheight=26)
    for i in range(n-1):
        x1,y1=positions[i];x2,y2=positions[i+1]
        if y1==y2:
            start=(x1+cardw+5,y1+cardh/2) if x2>x1 else (x1-5,y1+cardh/2)
            end=(x2-8,y2+cardh/2) if x2>x1 else (x2+cardw+8,y2+cardh/2)
        else:start=(x1+cardw/2,y1+cardh+6);end=(x2+cardw/2,y2-8)
        svg.arrow(start,end)
    if g['type']=='cycle':
        # A return line makes review explicit, without implying equal phase duration.
        lastx,lasty=positions[-1];firstx,firsty=positions[0]
        rail=10
        svg.parts.append(f'<path d="M{lastx} {lasty+cardh/2} H{rail} V{firsty+cardh/2} H{firstx-8}" fill="none" stroke="{COLORS["blue"]}" stroke-width="2" stroke-dasharray="6 5"/>')
        svg.arrow((firstx-16,firsty+cardh/2),(firstx-7,firsty+cardh/2),True)
    return svg.finish(h)

def compare_graph(g,mobile):
    columns=g['columns'];n=len(columns);w=400 if mobile else 900;pad=24;gap=24;cols=1 if mobile else n
    cardw=(w-pad*2-gap*(cols-1))/cols;inner=cardw-42;labelsize=24;bodysize=20
    info=[]
    for col in columns:
        label=wrap(col['label'],labelsize,inner-6);items=[wrap(it,bodysize,inner-14) for it in col['items']]
        hh=62+len(label)*30;ch=hh+20+sum(len(it)*26+23 for it in items)
        info.append((label,items,hh,ch))
    maxh=max(it[3] for it in info);total=pad*2+sum(it[3] for it in info)+gap*(n-1) if mobile else pad*2+maxh
    svg=SVG(w,g['title'],g['alt']);y=pad
    for i,(col,(label,items,hh,ch)) in enumerate(zip(columns,info)):
        x=pad if mobile else pad+i*(cardw+gap);height=ch if mobile else maxh
        svg.rect(x,y,cardw,height)
        svg.rect(x,y,cardw,hh,fill='wash')
        svg.text(str(i+1).zfill(2),x+21,y+31,14,fill='blue',weight='700')
        svg.text(label,x+21,y+62,24,weight='700',lineheight=30)
        by=y+hh+29
        for lines in items:
            svg.parts.append(f'<circle cx="{x+24}" cy="{by-6}" r="3" fill="{COLORS["blue"]}"/>')
            svg.text(lines,x+36,by,20,fill='muted',lineheight=26);by+=len(lines)*26+23
        if mobile:y+=ch+gap
    return svg.finish(total)

def bar_graph(g,mobile):
    pts=g['points'];w=400 if mobile else 900;pad=30;chartw=w-pad*2-70;maximum=max(p['value'] for p in pts) or 1
    # Explicit zero baseline, no truncated axis. Values are labeled in the native unit.
    infos=[wrap(p['label'],22,w-pad*2-6) for p in pts];rowheights=[len(x)*27+53 for x in infos]
    h=84+sum(rowheights)+43;svg=SVG(w,g['title'],g['alt']);svg.text(g['unit'],pad,30,18,fill='muted')
    svg.text('0',pad,64,16,fill='muted');svg.text(f'{maximum:g}',pad+chartw,64,16,fill='muted',anchor='middle')
    y=91
    for i,(p,lab,rh) in enumerate(zip(pts,infos,rowheights)):
        svg.text(lab,pad,y,22,weight='700',lineheight=27)
        by=y+(len(lab)-1)*27+15;svg.rect(pad,by,chartw,22,fill='wash',stroke='wash',rx=5)
        value=float(p['value']);assert math.isfinite(value) and value>=0
        if value:svg.rect(pad,by,chartw*value/maximum,22,fill='blue',stroke='blue',rx=5)
        svg.text(f'{value:g}',pad+chartw+14,by+19,20,weight='700')
        y+=rh
    return svg.finish(h)

def main():
    lessons=sum((json.loads((ROOT/f'app/data/{p}-lessons.json').read_text()) for p in ('performance','rehab')),[])
    manifest=[]
    for stale in OUT.glob('*.svg'):stale.unlink()
    for l in lessons:
        for g in l.get('graphics',[]):
            assert re.fullmatch(r'[a-z0-9-]+',g['id'])
            stem=l['id']+'--'+g['id'];entry={'lesson':l['id'],'graphic':g['id'],'type':g['type'],'files':[]}
            for mobile in (False,True):
                fn=node_graph if g['type'] in ('flow','cycle') else compare_graph if g['type']=='compare' else bar_graph if g['type']=='bars' else None
                assert fn,g['type']
                name=stem+('.mobile' if mobile else '')+'.svg';content=fn(g,mobile);(OUT/name).write_text(content)
                entry['files'].append('assets/lesson-graphics/'+name)
            manifest.append(entry)
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'lessons':len({m['lesson'] for m in manifest}),'graphics':len(manifest),'svgAssets':sum(len(m['files']) for m in manifest)}))
if __name__=='__main__':main()
