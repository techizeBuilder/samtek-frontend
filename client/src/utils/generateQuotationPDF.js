import jsPDF from 'jspdf';

/* ═══════════════════════════════════════════════════════════════════════════
   generateQuotationPDF.js
   Layout per screenshots:
     Page 1  : full header (~165mm) + table hdr + 1 product (fills rest) + footer
     Page 2+ : compact header (~26mm) + table hdr + 2 products (fill rest) + footer
     Final   : compact header + billing + terms + bank + sign + footer
   ═══════════════════════════════════════════════════════════════════════════ */

const PW=210, PH=297, ML=10, MR=10, CW=190;
const FOOTER_H  = 21;   // footer anchored near the page bottom (matches the print-mode
                        // preview): links + page number end ~8 mm above the page edge
const TBL_HDR_H = 12;   // table column-header row height mm
const AVAIL     = PH - FOOTER_H; // 276 mm usable per page

/* Compact header: visible box = 22 mm, consumed space (box + gap) = 24 mm */
const COMPACT_BOX_H = 22;
const COMPACT_HDR_H = COMPACT_BOX_H + 2;   // = 24 mm

/* Column widths  [sl, details, unit-price, qty, gst%, amount]  total = 190 mm
   Wider Amount column prevents large Indian numbers from clipping            */
const C = [10, 86, 28, 14, 12, 40];  // 10+86+28+14+12+40 = 190 ✓

/* Product row image: fixed square size so it always sits beside the text
   instead of being stretched/centered across an oversized row.              */
const IMG_SZ    = 32;
const MIN_ROW_H = 40;

/* ── Colours ─────────────────────────────────────────────────────────────── */
const NAVY   = [13,  71, 161];
const LBLUE  = [227, 242, 253];
const RED    = [200,   0,   0];
const GREY   = [120, 120, 120];
const LGREY  = [245, 245, 245];
const BLACK  = [  0,   0,   0];
const WHITE  = [255, 255, 255];
const BORDER = [160, 160, 160];
const LGREEN = [232, 245, 233];
const DGREEN = [ 27,  94,  32];
const DGREY  = [ 60,  60,  60];

const rgb  = (d,c) => d.setTextColor(c[0],c[1],c[2]);
const fill = (d,c) => d.setFillColor(c[0],c[1],c[2]);
const draw = (d,c) => d.setDrawColor(c[0],c[1],c[2]);

/* Rs. prefix — default Helvetica lacks the ₹ Unicode glyph  */
const fmt = n => 'Rs.' + (parseFloat(n)||0).toLocaleString('en-IN', {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});

/* ── Number to words ─────────────────────────────────────────────────────── */
function n2w(num){
  if(!num||num===0)return'Zero Only';
  const o=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'],
        t=['Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'],
        te=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const two=n=>n<10?o[n]:n<20?t[n-10]:te[Math.floor(n/10)]+(n%10?' '+o[n%10]:'');
  const thr=n=>n<100?two(n):o[Math.floor(n/100)]+' Hundred'+(n%100?' '+two(n%100):'');
  const toW=n=>{
    if(n<1000)return thr(n);
    const cr=Math.floor(n/10000000),lk=Math.floor((n%10000000)/100000),
          th=Math.floor((n%100000)/1000),r=n%1000;
    return(cr?toW(cr)+' Crore ':'')+(lk?toW(lk)+' Lakh ':'')+(th?toW(th)+' Thousand ':'')+(r?thr(r):'');
  };
  return toW(Math.floor(parseFloat(num)))+' Only';
}

/* ── Image loader with JPEG compression  ────────────────────────────────────
   Resizes to at most maxSizePx × maxSizePx and encodes as JPEG (quality 0.72)
   This keeps the PDF file small (< 500 KB typical) vs. 16 MB raw.            */
async function loadImgCompressed(src, maxSizePx=150){
  if(!src)return null;
  try{
    let dataUrl=src;
    if(!src.startsWith('data:')){
      const r=await fetch(src,{mode:'cors',cache:'force-cache'});
      if(!r.ok)return null;
      const blob=await r.blob();
      dataUrl=await new Promise(res=>{
        const fr=new FileReader();
        fr.onloadend=()=>res(fr.result);
        fr.onerror=()=>res(null);
        fr.readAsDataURL(blob);
      });
      if(!dataUrl)return null;
    }
    return await new Promise(res=>{
      const img=new Image();
      img.crossOrigin='anonymous';
      img.onload=()=>{
        const s=Math.min(maxSizePx/img.width,maxSizePx/img.height,1);
        const w=Math.max(1,Math.round(img.width*s));
        const h=Math.max(1,Math.round(img.height*s));
        const cv=document.createElement('canvas');
        cv.width=w; cv.height=h;
        const ctx=cv.getContext('2d');
        ctx.fillStyle='#fff';
        ctx.fillRect(0,0,w,h);
        ctx.drawImage(img,0,0,w,h);
        res(cv.toDataURL('image/jpeg',0.72));
      };
      img.onerror=()=>res(null);
      img.src=dataUrl;
    });
  }catch{return null;}
}

/* ── Page-break helper ──────────────────────────────────────────────────────
   If 'needed' mm won't fit before the footer zone, draw footer on current
   page, open a new page and return the y-cursor after the compact header.    */
function checkPageBreak(doc,y,needed,logoImg,cd){
  if(y+needed>AVAIL){
    drawFooter(doc,cd);
    doc.addPage();
    return drawCompactHeader(doc,logoImg,cd);
  }
  return y;
}

/* ── Helper to draw label-value pairs on a single line with exact spacing ── */
function drawLabelValue(doc, label, value, x, y, fontSize, labelColor, valueColor) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(fontSize);
  rgb(doc, labelColor);
  doc.text(label, x, y);
  const w = doc.getTextWidth(label);
  doc.setFont('helvetica', 'bold');
  rgb(doc, valueColor);
  doc.text(value, x + w, y);
}

/* ── Helper to draw vector footer icons (fixes encoding issues) ──────────── */
function drawFooterIcon(doc, type, x, y) {
  const BLUE_600 = [37, 99, 235];
  const PINK_500 = [236, 72, 153];
  const RED_500 = [239, 68, 68];
  const SKY_500 = [14, 165, 233];
  const PURPLE_600 = [147, 51, 234];
  
  doc.setLineWidth(0.3);
  
  if (type === 'website') {
    // Globe with meridians and parallels
    draw(doc, NAVY);
    doc.circle(x + 1.5, y + 1.5, 1.5);
    doc.line(x, y + 1.5, x + 3.0, y + 1.5);
    doc.line(x + 1.5, y, x + 1.5, y + 3.0);
    // Draw ellipses for better globe effect
    doc.ellipse(x + 1.5, y + 1.5, 1.5, 0.6);
    doc.ellipse(x + 1.5, y + 1.5, 0.6, 1.5);
  } else if (type === 'email') {
    // Modern envelope with thicker lines
    draw(doc, RED_500);
    doc.setLineWidth(0.4);
    doc.rect(x, y + 0.5, 3.0, 2.0);
    doc.line(x, y + 0.5, x + 1.5, y + 1.6);
    doc.line(x + 1.5, y + 1.6, x + 3.0, y + 0.5);
  } else if (type === 'instagram') {
    // Instagram with gradient effect (using pink)
    draw(doc, PINK_500);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, y + 0.2, 2.8, 2.8, 0.6, 0.6);
    doc.circle(x + 1.4, y + 1.6, 0.8);
    fill(doc, PINK_500);
    doc.circle(x + 2.1, y + 0.8, 0.25, 'F');
  } else if (type === 'facebook') {
    // Facebook rounded square with 'f'
    fill(doc, BLUE_600);
    doc.roundedRect(x, y + 0.2, 3.0, 3.0, 0.5, 0.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    rgb(doc, WHITE);
    doc.text('f', x + 1.15, y + 2.4);
  } else if (type === 'youtube') {
    // YouTube rounded rect with play button
    fill(doc, RED_500);
    doc.roundedRect(x, y + 0.4, 3.4, 2.4, 0.6, 0.6, 'F');
    fill(doc, WHITE);
    doc.triangle(x + 1.3, y + 1.0, x + 1.3, y + 2.2, x + 2.4, y + 1.6, 'F');
  } else if (type === 'linkedin') {
    // LinkedIn square with 'in'
    fill(doc, BLUE_600);
    doc.roundedRect(x, y + 0.2, 3.0, 3.0, 0.4, 0.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    rgb(doc, WHITE);
    doc.text('in', x + 0.9, y + 2.3);
  } else if (type === 'twitter') {
    // Twitter bird silhouette (X logo style)
    fill(doc, SKY_500);
    doc.setLineWidth(0.5);
    draw(doc, SKY_500);
    // Simplified X shape
    doc.line(x + 0.4, y + 0.4, x + 2.6, y + 2.6);
    doc.line(x + 2.6, y + 0.4, x + 0.4, y + 2.6);
    doc.circle(x + 1.5, y + 1.5, 1.4);
  } else {
    // Generic link icon
    draw(doc, PURPLE_600);
    doc.setLineWidth(0.4);
    // Chain link shape
    doc.ellipse(x + 0.8, y + 1.0, 0.6, 0.4, 'D');
    doc.ellipse(x + 2.2, y + 2.0, 0.6, 0.4, 'D');
    doc.line(x + 1.2, y + 1.2, x + 1.8, y + 1.8);
  }
}

/* ── Footer ─────────────────────────────────────────────────────────────── */
function drawFooter(doc, cd) {
  const fy = PH - FOOTER_H;
  draw(doc, BORDER); doc.setLineWidth(0.4);
  doc.line(ML, fy, PW - MR, fy);

  // Build footer items from company socialLinks array
  const socialLinks = (cd.socialLinks || []).filter(l => l && l.url && l.url.trim());

  if (socialLinks.length === 0) {
    // No social links — show nothing (blank footer zone, just the separator line)
    return;
  }

  // Column X coordinates for 3 columns
  const colX = [
    ML + 4,
    ML + CW / 3 + 2,
    ML + 2 * CW / 3 + 2
  ];

  // Split links into rows of 3
  const rows = [];
  for (let i = 0; i < socialLinks.length; i += 3) {
    rows.push(socialLinks.slice(i, i + 3));
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  // Row Y positions — packed just under the separator so the whole footer sits at the bottom
  const rowYs = [fy + 2, fy + 8];

  rows.slice(0, 2).forEach((row, rowIdx) => {
    const rowY = rowYs[rowIdx];
    row.forEach((link, colIdx) => {
      const x = colX[colIdx];
      drawFooterIcon(doc, link.type, x, rowY);
      // Clean up display text: strip protocol for websites, mailto: for email
      const displayText = (link.label && link.label.trim())
        ? link.label.trim()
        : link.url
            .replace(/^https?:\/\/(www\.)?/, '')
            .replace(/^mailto:/, '')
            .replace(/\/$/, '');
      rgb(doc, NAVY);
      doc.text(displayText, x + 5, rowY + 2.2, { maxWidth: CW / 3 - 8 });
    });
  });
}

/* ── Full Header – page 1 ───────────────────────────────────────────────────
   Returns Y cursor where the table header should start (~163 mm)             */
function drawFullHeader(doc,logo,cd,ld,qm){
  let y=ML;

  /* Company info box */
  draw(doc,BORDER); doc.setLineWidth(0.5);
  doc.rect(ML,y,CW,26);
  if(logo)try{doc.addImage(logo,'JPEG',ML+2,y+3,30,20);}catch(_){}

  const cx=ML+36;
  doc.setFont('helvetica','bold'); doc.setFontSize(14); rgb(doc,BLACK);
  doc.text(cd.name||'Samtek Machinery',cx,y+9,{maxWidth:CW*0.56});
  doc.setFont('helvetica','normal'); doc.setFontSize(8); rgb(doc,GREY);
  doc.text('MKT BY: '+(cd.legalName||'Samtek Engineering and GIS Solution Pvt Ltd.'),cx,y+14,{maxWidth:CW*0.56});
  doc.text(cd.address||'D-16 B S Road, Industrial Area, Near IMS College, Lal Kuan,',cx,y+18.5,{maxWidth:CW*0.56});
  doc.text([(cd.city||'Ghaziabad'),(cd.state||'Uttar Pradesh'),(cd.pin?'- '+cd.pin:'- 201001')].join(', '),cx,y+23,{maxWidth:CW*0.56});

  // Shifting the divider line to 136 mm and contact details to 139 mm to align them to the right corner
  const lineX = 136;
  draw(doc,BORDER); doc.setLineWidth(0.4);
  doc.line(lineX, y, lineX, y+26);

  const rx = 139;
  drawLabelValue(doc, 'Email: ', cd.email || 'sales@samtekmachinery.com', rx, y + 7.5, 8, GREY, BLACK);
  drawLabelValue(doc, 'Mobile: ', '+91-' + (cd.mobile || '7822813451'), rx, y + 13.0, 8, GREY, BLACK);
  drawLabelValue(doc, 'Website: ', cd.website || 'www.samtekmachinery.com', rx, y + 18.5, 8, GREY, BLACK);
  drawLabelValue(doc, 'GST: ', cd.gst || '09ABCDS1268B1ZJ', rx, y + 24.0, 8, GREY, BLACK);
  y+=28;

  /* To + Meta box */
  const toW=CW*0.58, metaW=CW*0.42;
  draw(doc,BORDER); doc.setLineWidth(0.4);
  doc.rect(ML,y,toW,28); doc.rect(ML+toW,y,metaW,28);

  doc.setFont('helvetica','bold'); doc.setFontSize(9); rgb(doc,BLACK);
  doc.text('To,',ML+3,y+6);
  rgb(doc,NAVY);
  doc.text((ld.contactPerson||'')+(ld.companyName?' ('+ld.companyName+')':''),ML+3,y+12,{maxWidth:toW-6});
  doc.setFont('helvetica','normal'); doc.setFontSize(8); rgb(doc,GREY);
  const addr=[ld.address,ld.city,ld.state].filter(Boolean).join(', ')+(ld.pincode?' - '+ld.pincode:'');
  doc.text('Address: '+addr,ML+3,y+18,{maxWidth:toW-6});
  doc.text('Email: '+(ld.email||''),ML+3,y+23);
  if(ld.mobile) doc.text('Mobile: '+ld.mobile,ML+3,y+27);

  const mx=ML+toW, mch=7;
  [
    ['Quotation No',   ': '+(qm.no||'SM-XXXX')],
    ['Quotation Date', ': '+(qm.date||new Date().toLocaleDateString('en-GB'))],
    ['Valid Till',     ': '+(qm.validTill||new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'))],
    ['Enquiry Ref. ID',': '+(ld.leadCode||'')],
  ].forEach((row,i)=>{
    draw(doc,BORDER);
    if(i<3) doc.line(mx,y+mch*(i+1),mx+metaW,y+mch*(i+1));
    doc.line(mx+metaW*0.5,y,mx+metaW*0.5,y+28);
    doc.setFont('helvetica','bold'); doc.setFontSize(8); rgb(doc,BLACK);
    doc.text(row[0],mx+2,y+mch*i+mch*0.75);
    doc.setFont('helvetica','normal');
    doc.text(row[1],mx+metaW*0.5+2,y+mch*i+mch*0.75);
  });
  y+=31;

  /* QUOTATION title */
  doc.setFont('helvetica','bold'); doc.setFontSize(20); rgb(doc,RED);
  doc.text('QUOTATION',PW/2,y+8,{align:'center'});
  const tw=doc.getTextWidth('QUOTATION');
  draw(doc,RED); doc.setLineWidth(0.7);
  doc.line(PW/2-tw/2,y+9,PW/2+tw/2,y+9);
  y+=16;

  /* Sub-heading */
  const hd=(qm.heading||ld.productRequired||'').toUpperCase();
  if(hd){
    doc.setFont('helvetica','bold'); doc.setFontSize(12); rgb(doc,NAVY);
    doc.text(hd,PW/2,y,{align:'center'});
    const hw=doc.getTextWidth(hd);
    draw(doc,NAVY); doc.setLineWidth(0.4);
    doc.line(PW/2-hw/2,y+1.5,PW/2+hw/2,y+1.5);
    y+=9;
  }

  /* Intro paragraph */
  doc.setFont('helvetica','bold'); doc.setFontSize(9); rgb(doc,BLACK);
  doc.text("Dear Sir/Ma'am,",ML,y); y+=5.5;
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); rgb(doc,DGREY);
  const intro='We are indeed thankful to you for referring us and evincing interest in our products. We studied your requirement carefully. Please find herewith our most exclusive and technically viable offer for your perusal and scrutiny. We are glad to submit our offer.';
  const iL=doc.splitTextToSize(intro,CW);
  doc.text(iL,ML,y);
  y+=iL.length*4+5;

  return y;
}

/* ── Compact Header – pages 2+ ──────────────────────────────────────────────
   Box height = 22 mm (COMPACT_BOX_H). GST at y+21 is safely inside the box.
   Returns Y cursor = ML + COMPACT_HDR_H (= 34 mm from page top)              */
function drawCompactHeader(doc,logo,cd){
  const y=ML;  // 10 mm from top
  draw(doc,BORDER); doc.setLineWidth(0.5);
  doc.rect(ML,y,CW,COMPACT_BOX_H);

  if(logo)try{doc.addImage(logo,'JPEG',ML+2,y+2,20,16);}catch(_){}

  const cx=ML+26;
  doc.setFont('helvetica','bold'); doc.setFontSize(11); rgb(doc,BLACK);
  doc.text(cd.name||'Samtek Machinery',cx,y+7,{maxWidth:CW*0.52});
  doc.setFont('helvetica','normal'); doc.setFontSize(7); rgb(doc,GREY);
  doc.text('MKT BY: '+(cd.legalName||'Samtek Engineering and GIS Solution Pvt Ltd.'),cx,y+11.5,{maxWidth:CW*0.52});
  doc.text(cd.address||'D-16 B S Road, Industrial Area, Near IMS College, Lal Kuan,',cx,y+15,{maxWidth:CW*0.52});

  // Vertical divider line separating Company Info and Contact Details
  const lineX = 136;
  draw(doc,BORDER); doc.setLineWidth(0.4);
  doc.line(lineX, y, lineX, y+COMPACT_BOX_H);

  const rx = 139;
  drawLabelValue(doc, 'Email: ', cd.email || 'sales@samtekmachinery.com', rx, y + 6.0, 7.5, GREY, BLACK);
  drawLabelValue(doc, 'Mobile: ', '+91-' + (cd.mobile || '7822813451'), rx, y + 11.0, 7.5, GREY, BLACK);
  drawLabelValue(doc, 'Website: ', cd.website || 'www.samtekmachinery.com', rx, y + 16.0, 7.5, GREY, BLACK);
  drawLabelValue(doc, 'GST: ', cd.gst || '09ABCDS1268B1ZJ', rx, y + 21.0, 7.5, GREY, BLACK);

  return y+COMPACT_HDR_H;  // 10 + 24 = 34 mm
}

/* ── Table column header ─────────────────────────────────────────────────── */
function drawTableHeader(doc,y){
  fill(doc,LBLUE); draw(doc,BORDER); doc.setLineWidth(0.4);
  doc.rect(ML,y,CW,TBL_HDR_H,'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(9); rgb(doc,NAVY);

  doc.text('Sl.',ML+C[0]/2,y+8,{align:'center'});
  doc.text('Product Details',ML+C[0]+4,y+8);

  /* Unit Price column */
  const prCx=ML+C[0]+C[1]+C[2]/2;
  doc.text('Unit Price',prCx,y+5,{align:'center'});
  doc.text('(INR)',prCx,y+10,{align:'center'});

  /* Qty column */
  const qx=ML+C[0]+C[1]+C[2]+C[3]/2;
  doc.text('Qty',qx,y+8,{align:'center'});

  /* GST% column */
  const gx=ML+C[0]+C[1]+C[2]+C[3]+C[4]/2;
  doc.text('GST',gx,y+5,{align:'center'});
  doc.text('%',  gx,y+10,{align:'center'});

  /* Amount column */
  const amtCx=ML+C[0]+C[1]+C[2]+C[3]+C[4]+C[5]/2;
  doc.text('Amount',amtCx,y+5,{align:'center'});
  doc.text('(INR)', amtCx,y+10,{align:'center'});

  /* Vertical column dividers */
  let cx2=ML; C.slice(0,-1).forEach(w=>{cx2+=w; doc.line(cx2,y,cx2,y+TBL_HDR_H);});
  return y+TBL_HDR_H;
}

/* ── Spec/usage lines shared by measurement and drawing ──────────────────── */
function buildSpecLines(item){
  const specs=[];
  if(item.specUsageText){
    item.specUsageText.split(' | ').map(l=>l.trim()).filter(Boolean).forEach(l=>specs.push('# '+l));
  }else{
    (item.specifications||[]).forEach(s=>{if(s.key&&s.value)specs.push('# '+s.key+' : '+s.value);});
    const apps=item.applications||item.features||[];
    if(apps.length)specs.push('# Usages: '+apps.join(', '));
  }
  return specs;
}

/* ── Measure the natural height a product row needs for its own content ───
   Used to pack rows dynamically per page without ever cutting an item's
   name/spec text (or its image) across a page break.                       */
function measureProductRow(doc,item){
  const px=4;
  const txMax=C[1]-IMG_SZ-px*2-4;

  doc.setFont('helvetica','bold'); doc.setFontSize(9);
  const nameL=doc.splitTextToSize(item.name||'',txMax);

  let h = px+6;
  h += nameL.length*4.5+2; // name
  h += 4;                  // "Product Code:" label line
  h += 5.5;                // code value line

  const specs=buildSpecLines(item);
  doc.setFont('helvetica','normal'); doc.setFontSize(8);
  specs.forEach(line=>{ h += doc.splitTextToSize(line,txMax).length*4.2; });

  h += 6; // bottom breathing room

  return Math.max(h, IMG_SZ+12, MIN_ROW_H);
}

/* ── Product row – image sits beside the text, vertically centered in a
   row sized to fit its own content (see measureProductRow) ─────────────── */
async function drawProductRow(doc,item,sl,y,img,rowH){
  const px=4;
  const imgSz=IMG_SZ;
  const txMax=C[1]-imgSz-px*2-4;     // text area width in details column

  /* Row bounding box */
  fill(doc,WHITE); draw(doc,BORDER); doc.setLineWidth(0.4);
  doc.rect(ML,y,CW,rowH,'FD');

  /* Column vertical dividers */
  let cx3=ML; C.slice(0,-1).forEach(w=>{cx3+=w; doc.line(cx3,y,cx3,y+rowH);});

  // Top alignment Y baseline coordinates (in line with product details text)
  const topBaselineY = y + px + 6;

  /* ── Serial number (aligned to top) ── */
  doc.setFont('helvetica','bold'); doc.setFontSize(10); rgb(doc,BLACK);
  doc.text(String(sl),ML+C[0]/2,topBaselineY,{align:'center'});

  /* ── Product details text ── */
  const dx=ML+C[0]+px;
  const nameL=doc.splitTextToSize(item.name||'',txMax);
  doc.setFont('helvetica','bold'); doc.setFontSize(9); rgb(doc,NAVY);
  let ty = topBaselineY;
  doc.text(nameL,dx,ty); ty+=nameL.length*4.5+2;

  doc.setFont('helvetica','bold'); doc.setFontSize(8); rgb(doc,BLACK);
  doc.text('Product Code:',dx,ty); ty+=4;
  doc.setFont('helvetica','normal'); doc.setFontSize(8); rgb(doc,BLACK);
  doc.text(item.code||'-',dx,ty); ty+=5.5;

  const specs=buildSpecLines(item);
  doc.setFont('helvetica','normal'); doc.setFontSize(8); rgb(doc,GREY);
  specs.forEach(line=>{
    const wrapped=doc.splitTextToSize(line,txMax);
    doc.text(wrapped,dx,ty);
    ty+=wrapped.length*4.2;
  });

  /* ── Product image (fixed size, vertically centered beside the text) ── */
  if(img){
    const ix=ML+C[0]+C[1]-imgSz-2;
    const iy=y+(rowH-imgSz)/2;
    try{
      draw(doc,BORDER); doc.setLineWidth(0.3);
      doc.rect(ix,iy,imgSz,imgSz);
      doc.addImage(img,'JPEG',ix+0.5,iy+0.5,imgSz-1,imgSz-1);
    }catch(_){}
  }

  /* ── Unit price – aligned to top ── */
  const prCx=ML+C[0]+C[1]+C[2]/2;
  const priceStr=fmt(item.price);
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); rgb(doc,BLACK);
  doc.text(priceStr,prCx,topBaselineY,{align:'center'});
  doc.setFont('helvetica','italic'); doc.setFontSize(7.5); rgb(doc,GREY);
  doc.text('Per piece',prCx,topBaselineY+4,{align:'center'});

  /* ── Qty – aligned to top ── */
  const qX=ML+C[0]+C[1]+C[2]+C[3]/2;
  doc.setFont('helvetica','bold'); doc.setFontSize(10); rgb(doc,BLACK);
  doc.text(String(item.quantity||1),qX,topBaselineY,{align:'center'});
  doc.setFont('helvetica','italic'); doc.setFontSize(7.5); rgb(doc,GREY);
  doc.text('piece',qX,topBaselineY+4,{align:'center'});

  /* ── GST % – aligned to top ── */
  const gX=ML+C[0]+C[1]+C[2]+C[3]+C[4]/2;
  doc.setFont('helvetica','bold'); doc.setFontSize(10); rgb(doc,BLACK);
  doc.text((item.gst||18)+'%',gX,topBaselineY,{align:'center'});

  /* ── Amount – aligned to top (GST-inclusive, same as preview) ── */
  const amtCx=ML+C[0]+C[1]+C[2]+C[3]+C[4]+C[5]/2;
  const amtStr=fmt((item.price||0)*(item.quantity||1)*(1+(item.gst||18)/100));
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); rgb(doc,BLACK);
  doc.text(amtStr,amtCx,topBaselineY,{align:'center'});

  return y+rowH;
}

/* ── Additional Charge Row – drawn compactly above the Billing summary ───── */
function drawChargeRow(doc, charge, y, rowH = 8) {
  fill(doc, WHITE); draw(doc, BORDER); doc.setLineWidth(0.4);
  doc.rect(ML, y, CW, rowH, 'FD');

  // vertical dividers
  let cx3 = ML; C.slice(0, -1).forEach(w => { cx3 += w; doc.line(cx3, y, cx3, y + rowH); });

  const topBaselineY = y + 5.5;

  // Sl: S
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); rgb(doc, RED);
  doc.text('S', ML + C[0]/2, topBaselineY, { align: 'center' });

  // Details
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); rgb(doc, NAVY);
  doc.text(charge.name || '', ML + C[0] + 4, topBaselineY, { maxWidth: C[1] - 8 });

  // Unit Price
  const prCx = ML + C[0] + C[1] + C[2]/2;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); rgb(doc, BLACK);
  doc.text(fmt(charge.price), prCx, topBaselineY, { align: 'center' });

  // Qty
  const qX = ML + C[0] + C[1] + C[2] + C[3]/2;
  doc.text('-', qX, topBaselineY, { align: 'center' });

  // GST % — dynamic per charge (same as preview)
  const gX = ML + C[0] + C[1] + C[2] + C[3] + C[4]/2;
  doc.text((charge.gst ?? 18) + '%', gX, topBaselineY, { align: 'center' });

  // Amount — GST-inclusive (same as preview)
  const amtCx = ML + C[0] + C[1] + C[2] + C[3] + C[4] + C[5]/2;
  doc.text(fmt((charge.price || 0) * (1 + (charge.gst ?? 18) / 100)), amtCx, topBaselineY, { align: 'center' });

  return y + rowH;
}

/* ── Exact height drawBilling() will occupy, so callers can page-break
   BEFORE drawing instead of letting the block get cut off mid-way ───────── */
function measureBillingHeight(doc,items,charges){
  const sub=items.reduce((s,it)=>s+(it.price||0)*(it.quantity||1),0)
           +(charges||[]).reduce((s,c)=>s+(c.price||0),0);
  const gst=items.reduce((s,it)=>s+(it.price||0)*(it.quantity||1)*((it.gst||18)/100),0)
           +(charges||[]).reduce((s,c)=>s+(c.price||0)*((c.gst??18)/100),0);
  const net=sub+gst;
  const wordStr=n2w(Math.round(net))+' (INR)';
  const wordLines=doc.splitTextToSize(wordStr,CW-6);
  const wordH=Math.max(10,wordLines.length*5+5);
  return 9+10+10+13+wordH+2;
}

/* ── Billing summary ────────────────────────────────────────────────────────
   Full-width table: labels right-align at 55%, amounts right-align at edge   */
function drawBilling(doc,y,items,charges){
  const sub=items.reduce((s,it)=>s+(it.price||0)*(it.quantity||1),0)
           +(charges||[]).reduce((s,c)=>s+(c.price||0),0);
  const gst=items.reduce((s,it)=>s+(it.price||0)*(it.quantity||1)*((it.gst||18)/100),0)
           +(charges||[]).reduce((s,c)=>s+(c.price||0)*((c.gst??18)/100),0);
  const net=sub+gst;

  /* Right-edge x for labels and amounts */
  const LABEL_X=PW-MR-CW*0.38; // ≈124 mm – label right-edge
  const AMT_X  =PW-MR-2;       // 198 mm – amount right-edge

  /* Header strip */
  fill(doc,LGREY); draw(doc,BORDER); doc.setLineWidth(0.3);
  doc.rect(ML,y,CW,9,'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(9); rgb(doc,BLACK);
  doc.text('Details (INR)',AMT_X,y+6.5,{align:'right'});
  y+=9;

  /* Total Gross row */
  draw(doc,BORDER); doc.rect(ML,y,CW,10,'D');
  doc.setFont('helvetica','normal'); doc.setFontSize(9); rgb(doc,GREY);
  doc.text('Total Gross Amount',LABEL_X,y+7,{align:'right'});
  doc.setFont('helvetica','bold'); rgb(doc,BLACK);
  doc.text(fmt(sub),AMT_X,y+7,{align:'right'});
  y+=10;

  /* GST row */
  draw(doc,BORDER); doc.rect(ML,y,CW,10,'D');
  doc.setFont('helvetica','normal'); doc.setFontSize(9); rgb(doc,GREY);
  doc.text('GST',LABEL_X,y+7,{align:'right'});
  doc.setFont('helvetica','bold'); rgb(doc,BLACK);
  doc.text(fmt(gst),AMT_X,y+7,{align:'right'});
  y+=10;

  /* Net Amount row */
  fill(doc,LGREY); draw(doc,BORDER);
  doc.rect(ML,y,CW,13,'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(10); rgb(doc,NAVY);
  doc.text('Net Amount (Round Off)',LABEL_X,y+9,{align:'right'});
  doc.text(fmt(net),AMT_X,y+9,{align:'right'});
  y+=13;

  /* Amount in words – auto-height so long amounts never get clipped */
  const wordStr=n2w(Math.round(net))+' (INR)';
  const wordLines=doc.splitTextToSize(wordStr,CW-6);
  const wordH=Math.max(10,wordLines.length*5+5);
  fill(doc,LGREEN); draw(doc,BORDER);
  doc.rect(ML,y,CW,wordH,'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(9); rgb(doc,DGREEN);
  wordLines.forEach((wl,i)=>doc.text(wl,AMT_X,y+7+i*5,{align:'right'}));
  y+=wordH+2;

  return y;
}

/* ── Terms & Notes ──────────────────────────────────────────────────────────
   Adds a new page automatically if content overflows (supports 9+ entries)   */
function drawTermsAndNotes(doc,y,terms,notes,logoImg,cd){
  const G=5;

  /* --- Terms & Conditions block --- */
  const termsLines=[];
  if(terms&&terms.length){
    terms.forEach((t,i)=>termsLines.push(...doc.splitTextToSize((i+1)+'. '+t.heading+': '+t.text,CW-7)));
  }
  const termsBh=termsLines.length ? termsLines.length*4.2+16 : 16;
  y=checkPageBreak(doc,y,termsBh+G,logoImg,cd);
  fill(doc,LBLUE); draw(doc,BORDER); doc.rect(ML,y,CW,termsBh,'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(9); rgb(doc,NAVY);
  doc.text('TERMS & CONDITIONS',ML+3,y+7);
  draw(doc,BORDER); doc.line(ML,y+9,ML+CW,y+9);
  if(termsLines.length){
    doc.setFont('helvetica','normal'); doc.setFontSize(8); rgb(doc,DGREY);
    doc.text(termsLines,ML+3,y+15);
  }else{
    doc.setFont('helvetica','italic'); doc.setFontSize(8); rgb(doc,GREY);
    doc.text('Not Applicable',ML+3,y+15);
  }
  y+=termsBh+G;

  /* --- Additional Notes block --- */
  const notesLines=[];
  if(notes&&notes.length){
    notes.forEach((n,i)=>notesLines.push(...doc.splitTextToSize((i+1)+'. '+n,CW-7)));
  }
  const notesBh=notesLines.length ? notesLines.length*4.2+16 : 16;
  y=checkPageBreak(doc,y,notesBh+G,logoImg,cd);
  fill(doc,LBLUE); draw(doc,BORDER); doc.rect(ML,y,CW,notesBh,'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(9); rgb(doc,NAVY);
  doc.text('ADDITIONAL NOTE',ML+3,y+7);
  draw(doc,BORDER); doc.line(ML,y+9,ML+CW,y+9);
  if(notesLines.length){
    doc.setFont('helvetica','italic'); doc.setFontSize(8); rgb(doc,DGREY);
    doc.text(notesLines,ML+3,y+15);
  }else{
    doc.setFont('helvetica','italic'); doc.setFontSize(8); rgb(doc,GREY);
    doc.text('Not Applicable',ML+3,y+15);
  }
  y+=notesBh+G;

  return y;
}

/* ── Bank details + closing note + signatory ─────────────────────────────── */
function drawBankAndSignatory(doc,y,bank,cd,user,stamp,logoImg){
  const G=5;

  /* Bank details block — values come from the company's saved bank details
     (My Company module); unfilled fields render blank, no hardcoded fallback */
  const bkL=[
    'NAME OF COMPANY - '+(bank.companyName||''),
    ...(bank.bankName?['BANK NAME - '+bank.bankName]:[]),
    'ACCOUNT NUMBER - '+(bank.accountNumber||''),
    'IFSC CODE - '+(bank.ifsc||''),
    'BRANCH - '+(bank.branch||''),
  ];
  const bkH=bkL.length*5.5+16;
  /* Need bank + closing note (~22mm) + signature (~35mm) all on same page */
  y=checkPageBreak(doc,y,bkH+65,logoImg,cd);
  fill(doc,LBLUE); draw(doc,BORDER); doc.rect(ML,y,CW,bkH,'FD');
  doc.setFont('helvetica','bold'); doc.setFontSize(9); rgb(doc,NAVY);
  doc.text('BANK DETAILS',ML+3,y+7);
  draw(doc,BORDER); doc.line(ML,y+9,ML+CW,y+9);
  doc.setFont('helvetica','bold'); doc.setFontSize(8.5); rgb(doc,BLACK);
  bkL.forEach((l,i)=>doc.text(l,ML+3,y+16+i*5.5));
  y+=bkH+G;

  /* Closing note */
  doc.setFont('helvetica','italic'); doc.setFontSize(8.5); rgb(doc,GREY);
  const cl='Thank you again for showing your interest with our company. We expect a healthy and long-term relationship with you. Early revert from your side will be highly appreciated. Please feel free to ask your queries.';
  const clL=doc.splitTextToSize(cl,CW);
  doc.text(clL,PW/2,y,{align:'center'});
  y+=clL.length*4.5+10;

  /* Thanks & Regards + Authorised Signatory */
  doc.setFont('helvetica','bold'); doc.setFontSize(10); rgb(doc,NAVY);
  doc.text('Thanks & Regards',ML,y);
  doc.text('Authorized Signatory',PW-MR,y,{align:'right'});
  y+=6;
  doc.setFont('helvetica','bold'); doc.setFontSize(9); rgb(doc,BLACK);
  doc.text(user?.fullName||cd.name||'Samtek Machinery',ML,y);
  doc.setFont('helvetica','normal'); doc.setFontSize(8.5); rgb(doc,GREY);
  if(user?.mobile) doc.text('Mobile: '+user.mobile,ML,y+5);
  if(user?.email)  doc.text('Email: '+user.email,ML,y+10);

  if(stamp)try{doc.addImage(stamp,'JPEG',PW-MR-32,y-4,32,28);}catch(_){}
  return y;
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ════════════════════════════════════════════════════════════════════════════ */
export async function generateQuotationPDF(opts={}){
  const {
    logoDataUrl:logo, stampDataUrl:stamp,
    companyData:cd={}, leadData:ld={}, quotationMeta:qm={},
    selectedItems:items=[], additionalCharges:charges=[],
    selectedTerms:terms=[], selectedNotes:notes=[],
    bankDetails:bank={}, loggedInUser:user={},
    fileName='Quotation.pdf', returnBase64=false,
  }=opts;

  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});

  /* ── Compress logo and stamp (small px size → small PDF) ── */
  const logoImg  = logo  ? await loadImgCompressed(logo,  120) : null;
  const stampImg = stamp ? await loadImgCompressed(stamp, 120) : null;

  /* ── Compress product images ── */
  const imgs={};
  await Promise.all(items.map(async item=>{
    if(!item.image)return;
    const apiBase=(typeof import.meta!=='undefined'
      ?(import.meta.env?.VITE_API_URL||'http://localhost:5000')
      :'http://localhost:5000').replace('/api','');
    const src=(item.image.startsWith('http')||item.image.startsWith('data:'))
      ?item.image:apiBase+item.image;
    imgs[item.id]=await loadImgCompressed(src,150);
  }));

  /* ── Page 1 always starts with the full header + table header, even with
     zero items, so charges/billing have a consistent anchor to flow from ── */
  let y=drawFullHeader(doc,logoImg,cd,ld,qm);
  y=drawTableHeader(doc,y);

  /* ── Dynamically pack product rows ──
     Each row is measured to its own content (name + code + specs + image)
     via measureProductRow, so however many items fit cleanly on a page is
     however many are shown there — never cutting an item across pages.
     Page 1 uses the already-drawn full header; every subsequent page opens
     with the compact header + a fresh table header.                        */
  let slNo=1;
  let idx=0;
  let firstPage=true;
  while(idx<items.length){
    if(!firstPage){
      y=drawCompactHeader(doc,logoImg,cd);
      y=drawTableHeader(doc,y);
    }
    let placedOnThisPage=false;
    while(idx<items.length){
      const rowH=measureProductRow(doc,items[idx]);
      if(y+rowH>AVAIL){
        if(!placedOnThisPage){
          /* Edge case: a single item's content is taller than a full page —
             draw it anyway rather than looping forever.                     */
          y=await drawProductRow(doc,items[idx],slNo++,y,imgs[items[idx].id]||null,rowH);
          idx++; placedOnThisPage=true;
          continue;
        }
        break;
      }
      y=await drawProductRow(doc,items[idx],slNo++,y,imgs[items[idx].id]||null,rowH);
      idx++; placedOnThisPage=true;
    }
    if(idx<items.length){
      drawFooter(doc,cd);
      doc.addPage();
    }
    firstPage=false;
  }

  /* ── Additional charges + billing summary ──
     Treated as one block: if it doesn't fully fit in the space left on the
     current page, the whole block moves to a new page instead of being cut.  */
  const billH=measureBillingHeight(doc,items,charges);
  const chargesH=(charges&&charges.length)?charges.length*8:0;
  let freshPage=false;
  if(y+chargesH+billH>AVAIL){
    drawFooter(doc,cd);
    doc.addPage();
    y=drawCompactHeader(doc,logoImg,cd);
    freshPage=true;
  }

  if(charges&&charges.length>0){
    if(freshPage) y=drawTableHeader(doc,y);
    for(const charge of charges){
      if(y+8>AVAIL){
        drawFooter(doc,cd);
        doc.addPage();
        y=drawCompactHeader(doc,logoImg,cd);
        y=drawTableHeader(doc,y);
      }
      y=drawChargeRow(doc,charge,y);
    }
  }

  y=drawBilling(doc,y,items,charges);
  y+=4;

  /* ── Terms, notes, bank & signatory flow onto the same page whenever they
     fit; each helper page-breaks internally only when its own block would
     otherwise be cut.                                                       */
  y=drawTermsAndNotes(doc,y,terms,notes,logoImg,cd);
  y=drawBankAndSignatory(doc,y,bank,cd,user,stampImg,logoImg);
  drawFooter(doc,cd);

  /* ── Page numbers (bottom-right, just below the footer link rows) ── */
  const total=doc.internal.getNumberOfPages();
  for(let pg=1;pg<=total;pg++){
    doc.setPage(pg);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); rgb(doc,GREY);
    doc.text('Page '+pg+' / '+total,PW-MR,PH-FOOTER_H+13,{align:'right'});
  }

  if(returnBase64)return doc.output('datauristring');
  doc.save(fileName);
}
