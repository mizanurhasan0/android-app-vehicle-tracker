import React, { useMemo, useRef, useEffect } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { WebView } from 'react-native-webview';
import { HistoryPoint, HistoryRoute } from '../api/types';
import { i18n, Language, useTranslation } from '../i18n';

export function historyMapLabels(language: Language) {
  const t = i18n.getFixedT(language);
  return {
    language,
    zoomIn: t('Zoom in'),
    zoomOut: t('Zoom out'),
    fit: t('Fit'),
    start: t('Start'),
    end: t('End'),
    contributors: t('contributors'),
    unavailable: t('Map tiles unavailable. Recorded route remains visible.'),
  };
}

const scriptData = (value: unknown) =>
  JSON.stringify(value).replace(/</g, '\\u003c');

// Bundled renderer: no remote scripts, credentials, or executable server content.
// Only visible raster tiles are requested; WebView's HTTP cache stays enabled.
export function historyMapHtml(
  route: HistoryRoute,
  language: Language = i18n.language === 'bn' ? 'bn' : 'en',
) {
  if (
    route.segments.reduce((n, segment) => n + segment.points.length, 0) > 2000
  ) {
    throw new Error(
      'Route exceeds the display limit. Choose a shorter period.',
    );
  }
  const segments = route.segments.map(segment =>
    segment.points.map(point => {
      if (
        ![point.latitude, point.longitude].every(Number.isFinite) ||
        Math.abs(point.latitude) > 90 ||
        Math.abs(point.longitude) > 180
      )
        throw new Error('Route contains invalid coordinates.');
      return [point.latitude, point.longitude];
    }),
  );
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https://tile.openstreetmap.org;"><style>
html,body,#map{margin:0;width:100%;height:100%;overflow:hidden;background:#e6eee8;font-family:system-ui}#map{touch-action:none;position:relative}#tiles,#route{position:absolute;inset:0;width:100%;height:100%}#tiles img{position:absolute;width:256px;height:256px}#controls{position:absolute;top:12px;left:12px;display:flex;gap:6px}button{font-size:18px;min-width:44px;min-height:44px;background:white;color:#087F78;border:1px solid #E1ECEB;border-radius:12px;box-shadow:0 2px 6px #18343b12}#credit,#status{position:absolute;bottom:0;background:#fffffff0;padding:4px;font-size:11px}#credit{right:0}#status{left:0;bottom:24px;color:#923}a{color:#146}
</style></head><body><div id="map"><div id="tiles"></div><svg id="route"></svg><div id="controls"><button id="plus" aria-label="Zoom in">+</button><button id="minus" aria-label="Zoom out">−</button><button id="fit">Fit</button></div><div id="status"></div><div id="credit">© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> <span id="contributors">contributors</span></div></div><script>
(function(){
'use strict';
var labels=${scriptData(historyMapLabels(language))}, tilesUnavailable=false;
var segments=${JSON.stringify(
    segments,
  )}, all=segments.flat(), zoom=14, cx=0, cy=0, selected=null;
var map=document.getElementById('map'),tiles=document.getElementById('tiles'),svg=document.getElementById('route');
function project(p){var lat=Math.max(-85.0511,Math.min(85.0511,p[0]))*Math.PI/180;return [(p[1]+180)/360,(1-Math.log(Math.tan(lat)+1/Math.cos(lat))/Math.PI)/2];}
function fit(){if(!all.length)return;var ps=all.map(project),xs=ps.map(p=>p[0]),ys=ps.map(p=>p[1]);var l=Math.min(...xs),r=Math.max(...xs),t=Math.min(...ys),b=Math.max(...ys);cx=(l+r)/2;cy=(t+b)/2;zoom=Math.max(1,Math.min(17,Math.floor(Math.log2(Math.min((map.clientWidth-60)/(256*Math.max(r-l,0.00001)),(map.clientHeight-70)/(256*Math.max(b-t,0.00001)))))));draw();}
function xy(p){var q=project(p),scale=256*Math.pow(2,zoom);return [(q[0]-cx)*scale+map.clientWidth/2,(q[1]-cy)*scale+map.clientHeight/2];}
function node(tag,attrs){var e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.keys(attrs).forEach(k=>e.setAttribute(k,attrs[k]));svg.appendChild(e);return e;}
function marker(p,label,color){var q=xy(p);node('circle',{cx:q[0],cy:q[1],r:8,fill:color,stroke:'white','stroke-width':3});node('text',{x:q[0]+10,y:q[1]-10,fill:'#123','font-size':14,'font-weight':'bold',stroke:'white','stroke-width':3,'paint-order':'stroke'}).textContent=label;}
function draw(){var count=Math.pow(2,zoom),scale=256*count,left=cx*scale-map.clientWidth/2,top=cy*scale-map.clientHeight/2;var used={};
for(var x=Math.floor(left/256);x<=Math.floor((left+map.clientWidth)/256);x++)for(var y=Math.floor(top/256);y<=Math.floor((top+map.clientHeight)/256);y++){if(y<0||y>=count)continue;var key=zoom+'-'+x+'-'+y;used[key]=true;var im=document.getElementById(key);if(!im){im=document.createElement('img');im.id=key;im.alt='';im.draggable=false;im.src='https://tile.openstreetmap.org/'+zoom+'/'+((x%count+count)%count)+'/'+y+'.png';im.onerror=function(){tilesUnavailable=true;document.getElementById('status').textContent=labels.unavailable;};tiles.appendChild(im);}im.style.left=(x*256-left)+'px';im.style.top=(y*256-top)+'px';}
Array.from(tiles.children).forEach(e=>{if(!used[e.id])e.remove();});svg.replaceChildren();segments.forEach(s=>{if(s.length>1)node('polyline',{points:s.map(p=>xy(p).join(',')).join(' '),fill:'none',stroke:'#087F78','stroke-width':4,'stroke-linejoin':'round'});else if(s.length)marker(s[0],'','#146b48');});if(all.length){marker(all[0],labels.start,'#146b48');if(all.length>1)marker(all[all.length-1],labels.end,'#a23445');}if(selected)marker(selected,'●','#285de0');}
window.setHistoryLabels=function(next){labels=next;document.documentElement.lang=labels.language;document.getElementById('plus').setAttribute('aria-label',labels.zoomIn);document.getElementById('minus').setAttribute('aria-label',labels.zoomOut);document.getElementById('fit').textContent=labels.fit;document.getElementById('contributors').textContent=labels.contributors;if(tilesUnavailable)document.getElementById('status').textContent=labels.unavailable;draw();};window.setHistoryLabels(labels);
window.selectHistoryPoint=function(p){selected=p;draw();};document.getElementById('plus').onclick=function(){zoom=Math.min(19,zoom+1);draw();};document.getElementById('minus').onclick=function(){zoom=Math.max(1,zoom-1);draw();};document.getElementById('fit').onclick=fit;
var drag=null;map.onpointerdown=function(e){if(e.target.closest('button,a'))return;drag=[e.clientX,e.clientY,cx,cy];map.setPointerCapture(e.pointerId);};map.onpointermove=function(e){if(!drag)return;var scale=256*Math.pow(2,zoom);cx=drag[2]-(e.clientX-drag[0])/scale;cy=Math.max(0,Math.min(1,drag[3]-(e.clientY-drag[1])/scale));draw();};map.onpointerup=map.onpointercancel=function(){drag=null;};window.onresize=fit;fit();
})();</script></body></html>`;
}
export function HistoryMap({
  route,
  selected,
  style,
}: {
  route: HistoryRoute;
  selected?: HistoryPoint;
  style?: StyleProp<ViewStyle>;
}) {
  const { i18n: translation } = useTranslation();
  const language = translation.language === 'bn' ? 'bn' : 'en';
  const web = useRef<WebView<object>>(null);
  const source = useMemo(
    () => ({
      html: historyMapHtml(route),
      baseUrl: 'https://pathsathi.local/',
    }),
    [route],
  );
  const updateMarker = () => {
    const point = selected ? [selected.latitude, selected.longitude] : null;
    web.current?.injectJavaScript(
      `window.selectHistoryPoint && window.selectHistoryPoint(${JSON.stringify(
        point,
      )}); true;`,
    );
  };
  const updateLabels = () => {
    web.current?.injectJavaScript(
      `window.setHistoryLabels && window.setHistoryLabels(${scriptData(
        historyMapLabels(language),
      )}); true;`,
    );
  };
  useEffect(updateMarker, [selected]);
  useEffect(updateLabels, [language]);
  return (
    <WebView<object>
      ref={web}
      style={[local.map, style]}
      source={source}
      originWhitelist={['https://pathsathi.local']}
      onShouldStartLoadWithRequest={request =>
        request.url === 'about:blank' ||
        request.url === 'https://pathsathi.local/'
      }
      onLoadEnd={() => {
        updateMarker();
        updateLabels();
      }}
      javaScriptEnabled
      domStorageEnabled={false}
      cacheEnabled
      userAgent="PathSathi-Android/1.0 (com.pathsathi.transport)"
      allowFileAccess={false}
      mixedContentMode="never"
      setSupportMultipleWindows={false}
    />
  );
}
const local = StyleSheet.create({
  map: { height: 360, backgroundColor: '#E6EEE8' },
});
