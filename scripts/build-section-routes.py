"""Build static, crawlable versions of the existing scrolling site.
Edit _site-source/*.html, footer.html, nav.html and scripts/seo-routes.json;
then run python scripts/build-section-routes.py (requires lxml and Pillow).
"""
from pathlib import Path
from copy import deepcopy
import json,re
from urllib.parse import urlsplit,unquote
from lxml import html,etree
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
BASE='https://taxpower.co/'
config=json.loads((ROOT/'scripts/seo-routes.json').read_text())
variants=json.loads((ROOT/'scripts/image-variants.json').read_text())
source=html.fromstring((ROOT/'_site-source/index.html').read_text())
sections={}
for name in ['taxpowergst','taxpowertds','pricing','downloads','aboutus','support']:
    doc=html.fromstring((ROOT/f'_site-source/{name}.html').read_text())
    node=doc.xpath('//main')[0];node.set('id',name)
    node.set('class',node.get('class','')+' loaded-page-section')
    node.set('data-loaded-page',name+'.html');sections[name]=node
container=source.xpath('//*[@data-page-sections]')[0]
container.set('data-prerendered','true')
for node in sections.values():container.append(deepcopy(node))
# Shared parts are present before JavaScript, so links are immediately crawlable.
navdoc=html.fromstring((ROOT/'nav.html').read_text())
slot=source.xpath('//*[@data-nav-slot]')[0];parent=slot.getparent();pos=parent.index(slot)
for node in navdoc.xpath('//header | //button[@id="headerRevealHint"]'):
    parent.insert(pos,deepcopy(node));pos+=1
parent.remove(slot)
slot=source.xpath('//*[@data-footer-slot]')[0];slot.getparent().replace(slot,html.fromstring((ROOT/'footer.html').read_text()))
head=source.find('head')
for node in head.xpath('./script[@type="application/ld+json"] | ./meta[@property] | ./meta[starts-with(@name,"twitter:")]'):
    head.remove(node)
for attrs in [ {'rel':'preconnect','href':'https://fonts.googleapis.com'}, {'rel':'preconnect','href':'https://fonts.gstatic.com','crossorigin':'anonymous'}, {'rel':'stylesheet','href':'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap'} ]:
    head.append(etree.Element('link',attrs))
head.append(etree.Element('meta',{'name':'robots','content':'index, follow, max-image-preview:large'}))
# Preserve existing heading typography independently of semantic heading levels.
for h in source.xpath('//h1'):
    h.set('class',(h.get('class','')+' original-h1').strip());h.set('data-page-heading','true')
# The Magnum card is a peer company heading, not an H3 immediately after H1.
for h in source.xpath('//*[contains(@class,"se-magnum-panel")]/h3'):
    h.tag='h2';h.set('class','magnum-company-heading')
# Normalize navigation to published clean routes, preserving in-page feature anchors.
alias={'index.html':'home','taxpowergst.html':'taxpowergst','taxpowertds.html':'taxpowertds','pricing.html':'pricing','downloads.html':'downloads','aboutus.html':'aboutus','support.html':'support'}
anchors={'home':'home','taxpowergst':'taxpowergst','dashboard_bg':'gst-return','gst-return':'gst-return','gst-billing-intro':'gst-billing','gst-einvoice':'gst-billing','taxpowertds':'taxpowertds','pricing':'pricing','pricing-banner':'pricing','downloads':'downloads','downloads-banner':'downloads','aboutus':'aboutus','support':'support','technical-support':'technical-support','demo-enquiry':'demo-enquiry'}
for a in source.xpath('//a[@href]'):
    u=urlsplit(a.get('href'))
    if u.scheme or u.netloc:continue
    if u.fragment in anchors and (not u.path or u.path in alias):a.set('href',anchors[u.fragment])
    elif u.path in alias and not u.fragment:a.set('href',alias[u.path])
# Serve smaller images at the same intrinsic dimensions; keep decorative alt empty.
for img in source.xpath('//img[@src]'):
    old=img.get('src');path=unquote(old.split('?')[0]);actual=variants.get(path,path)
    if actual!=path:img.set('src',actual)
    file=ROOT/actual
    if file.exists() and file.suffix.lower()!='.svg':
        with Image.open(file) as im:w,h=im.size
        if not img.get('width'):img.set('width',str(w))
        if not img.get('height'):img.set('height',str(h))
    if not img.get('alt') and '/swt_icon/' not in path and '/frms_bg/' not in path:
        if any(folder in path for folder in ['/gst_ss/','/tds_ss/','/billing_ss/']):
            img.set('alt',Path(path).stem.replace('_',' ').replace('taxpowergst','TaxPower GST').replace('taxpowertds','TaxPower TDS'))
    if not img.get('decoding'):img.set('decoding','async')
    if not img.get('fetchpriority') and not img.get('loading'):img.set('loading','lazy')
# Lightweight illustration variants referenced by CSS are updated separately.
for el in source.xpath('//script[@src] | //link[@href]'):
    key='src' if el.tag=='script' else 'href';value=el.get(key)
    if value.startswith(('js/','css/')):el.set(key,value.split('?')[0]+('?v=20261020-logo' if value.startswith('css/aboutus.css') else '?v=20261017-seo'))
source.xpath('//h1[@class="visually-hidden original-h1"]')
organization={'@type':'Organization','@id':BASE+'#siddharth','name':'Siddharth Enterprises','url':BASE+'aboutus','logo':BASE+'asset/swt_icon/siddharth-enterprises-satin-3d.webp','email':'support@taxpower.co','telephone':['+919145073173','+917755912821'],'address':{'@type':'PostalAddress','streetAddress':'Plot No.14, Godawari Apartment, Amar Nagar Road, T-Point Hingna, Hingna MIDC','addressLocality':'Nagpur','addressRegion':'Maharashtra','postalCode':'440016','addressCountry':'IN'}}
for route,meta in config.items():
    doc=deepcopy(source);head=doc.find('head');canonical=BASE+meta.get('canonical',route)
    doc.xpath('//title')[0].text=meta['title']
    doc.xpath('//meta[@name="description"]')[0].set('content',meta['description'])
    doc.xpath('//link[@rel="canonical"]')[0].set('href',canonical)
    for prop,value in {'og:title':meta['title'],'og:description':meta['description'],'og:url':canonical,'og:type':'website','og:site_name':'TaxPower','og:image':BASE+'asset/swt_icon/taxpower_icon.png'}.items():head.append(etree.Element('meta',{'property':prop,'content':value}))
    for name,value in {'twitter:card':'summary','twitter:title':meta['title'],'twitter:description':meta['description']}.items():head.append(etree.Element('meta',{'name':name,'content':value}))
    primary=doc.get_element_by_id(meta['section'])
    for node in doc.xpath('//main'):node.tag='section';node.set('data-route-section','true')
    primary.tag='main';primary.set('data-route-section','true')
    heading=primary.xpath('.//*[@data-page-heading]')[0]
    if meta.get('heading'):heading=doc.get_element_by_id(meta['heading']);heading.set('class',(heading.get('class','')+' original-h2').strip())
    for h in doc.xpath('//h1'):h.tag='h2'
    heading.tag='h1'
    if not heading.get('id'):heading.set('id','page-heading-'+meta['section'])
    primary.set('aria-labelledby',heading.get('id'))
    graph=[organization,{'@type':'Organization','@id':BASE+'#magnum','name':'Magnum Infosystem Pvt. Ltd.','url':'https://www.magnuminfosystem.com/Default'},{'@type':'WebSite','@id':BASE+'#website','url':BASE+'home','name':'TaxPower','publisher':{'@id':BASE+'#siddharth'}},{'@type':'ContactPage' if meta['section']=='support' else 'AboutPage' if route=='aboutus' else 'WebPage','@id':canonical+'#webpage','url':canonical,'name':meta['title'],'description':meta['description'],'isPartOf':{'@id':BASE+'#website'},'publisher':{'@id':BASE+'#siddharth'}},{'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Home','item':BASE+'home'}]+([] if route=='home' else [{'@type':'ListItem','position':2,'name':config[meta.get('canonical',route)]['title'].split('|')[0].strip(),'item':canonical}])}]
    if meta['section'] in ['taxpowergst','taxpowertds']:
        graph.append({'@type':'SoftwareApplication','name':'TaxPower Billing' if route=='gst-billing' else 'TaxPower TDS' if route=='taxpowertds' else 'TaxPower GST','applicationCategory':'BusinessApplication','operatingSystem':'Windows','url':canonical,'publisher':{'@id':BASE+'#magnum'}})
    if route=='pricing':
        graph.append({'@type':'ItemList','name':'TaxPower Complete Suite Plans','itemListElement':[{'@type':'ListItem','position':i+1,'item':{'@type':'Product','name':'TaxPower '+edition+' Complete Suite','brand':{'@type':'Brand','name':'TaxPower'},'offers':{'@type':'Offer','price':price,'priceCurrency':'INR','url':canonical,'seller':{'@id':BASE+'#siddharth'}}}} for i,(edition,price) in enumerate([('Professional',15000),('Business',20000)])]})
    schema=etree.Element('script',{'type':'application/ld+json','id':'site-structured-data','data-route':route});schema.text=json.dumps({'@context':'https://schema.org','@graph':graph});head.append(schema)
    # Both .html resolution and directory resolution serve the same static page.
    for filename,nested in [(route+'.html',False),(route+'/index.html',True)]+([('index.html',False)] if route=='home' else []):
        output=deepcopy(doc);base=etree.Element('base',{'href':'/'});output.find('head').insert(0,base)
        path=ROOT/filename;path.parent.mkdir(exist_ok=True);rendered='<!DOCTYPE html>\n'+html.tostring(output,encoding='unicode',method='html')
        path.write_text('\n'.join(line.rstrip() for line in rendered.splitlines())+'\n')
# Metadata for client-side navigation uses the same source as the static HTML.
routing=ROOT/'js/section-routes.js';js=routing.read_text();js=re.sub(r'  const titles = \{.*?\};','  const titles = '+json.dumps({r:m['title'] for r,m in config.items()},indent=2)+';',js,flags=re.S)
js=re.sub(r'  const routeMetadata = \{.*?\};\n','',js,flags=re.S)
js=js.replace('  function updateTitle() {','  const routeMetadata = '+json.dumps(config,indent=2)+';\n  function updateTitle() {')
routing.write_text(js)
canonical_routes=[r for r,m in config.items() if not m.get('canonical')]
(ROOT/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join('  <url><loc>'+BASE+r+'</loc></url>\n' for r in canonical_routes)+'</urlset>\n')
(ROOT/'robots.txt').write_text('User-agent: *\nAllow: /\n\nSitemap: '+BASE+'sitemap.xml\n')
print('Built',len(config),'routes with static content, metadata, headings and schema.')
