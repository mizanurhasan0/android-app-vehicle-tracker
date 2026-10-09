import React, { useMemo, useRef, useEffect } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
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
html,body,#map{margin:0;width:100%;height:100%;overflow:hidden;background:#e8f0ec;font-family:system-ui}#map{touch-action:none;position:relative}#tiles,#route{position:absolute;inset:0;width:100%;height:100%}#route{pointer-events:none}#tiles img{position:absolute;width:256px;height:256px}#controls{position:absolute;right:12px;bottom:34px;display:flex;flex-direction:column;gap:7px}button{font-size:25px;font-weight:500;width:43px;height:43px;background:#fff;color:#064f43;border:1px solid #dbe6e2;border-radius:12px;box-shadow:0 3px 12px #082c2630}button:active{background:#e8f5ef}#fit{font-size:12px;font-weight:700}#credit,#status{position:absolute;background:#fffffff2;padding:4px 7px;font-size:10px}#credit{right:0;bottom:0;border-top-left-radius:6px;color:#426057}#status{left:8px;bottom:8px;color:#9a4040;border-radius:6px;display:none}a{color:#315e52}
</style></head><body><div id="map"><div id="tiles"></div><svg id="route"></svg><div id="controls"><button id="fit">Fit</button><button id="plus" aria-label="Zoom in">+</button><button id="minus" aria-label="Zoom out">−</button></div><div id="status" role="status"></div><div id="credit">© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> <span id="contributors">contributors</span></div></div><script>
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
function node(tag,attrs,parent){var e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.keys(attrs).forEach(k=>e.setAttribute(k,attrs[k]));(parent||svg).appendChild(e);return e;}
function marker(p,label,color,parent){var halo=node('circle',{r:14,fill:'white',stroke:color,'stroke-width':3},parent),circle=node('circle',{r:7,fill:color,stroke:'white','stroke-width':1},parent),text=node('text',{fill:'#173d34','font-size':12,'font-weight':'bold',stroke:'white','stroke-width':3,'paint-order':'stroke'},parent);text.textContent=label;return {point:p,halo:halo,circle:circle,text:text};}
function positionMarker(m){var q=xy(m.point);m.halo.setAttribute('cx',q[0]);m.halo.setAttribute('cy',q[1]);m.circle.setAttribute('cx',q[0]);m.circle.setAttribute('cy',q[1]);m.text.setAttribute('x',q[0]+17);m.text.setAttribute('y',q[1]-12);}
var lines=[],routeMarkers=[];
segments.forEach(function(s){if(s.length>1){lines.push({points:s,element:node('polyline',{fill:'none',stroke:'#fff','stroke-width':9,'stroke-linejoin':'round','stroke-linecap':'round'})});lines.push({points:s,element:node('polyline',{fill:'none',stroke:'#006a50','stroke-width':5,'stroke-linejoin':'round','stroke-linecap':'round'})});}else if(s.length)routeMarkers.push(marker(s[0],'','#006a50'));});
var start=all.length?marker(all[0],labels.start,'#00845f'):null,end=all.length>1?marker(all[all.length-1],labels.end,'#d9433f'):null;
if(start)routeMarkers.push(start);if(end)routeMarkers.push(end);
var selectionLayer=node('g',{'data-layer':'selection'}),selectionMarker=null;
function drawSelection(){if(!selected){selectionLayer.replaceChildren();selectionMarker=null;return;}if(!selectionMarker)selectionMarker=marker(selected,'●','#164fcb',selectionLayer);selectionMarker.point=selected;positionMarker(selectionMarker);}
function draw(){var count=Math.pow(2,zoom),scale=256*count,left=cx*scale-map.clientWidth/2,top=cy*scale-map.clientHeight/2;var used={};
for(var x=Math.floor(left/256);x<=Math.floor((left+map.clientWidth)/256);x++)for(var y=Math.floor(top/256);y<=Math.floor((top+map.clientHeight)/256);y++){if(y<0||y>=count)continue;var key=zoom+'-'+x+'-'+y;used[key]=true;var im=document.getElementById(key);if(!im){im=document.createElement('img');im.id=key;im.alt='';im.draggable=false;im.src='https://tile.openstreetmap.org/'+zoom+'/'+((x%count+count)%count)+'/'+y+'.png';im.onerror=function(){tilesUnavailable=true;var status=document.getElementById('status');status.textContent=labels.unavailable;status.style.display='block';};tiles.appendChild(im);}im.style.left=(x*256-left)+'px';im.style.top=(y*256-top)+'px';}
Array.from(tiles.children).forEach(e=>{if(!used[e.id])e.remove();});lines.forEach(function(line){line.element.setAttribute('points',line.points.map(p=>xy(p).join(',')).join(' '));});routeMarkers.forEach(positionMarker);drawSelection();}
window.setHistoryLabels=function(next){labels=next;document.documentElement.lang=labels.language;document.getElementById('plus').setAttribute('aria-label',labels.zoomIn);document.getElementById('minus').setAttribute('aria-label',labels.zoomOut);document.getElementById('fit').textContent=labels.fit;document.getElementById('contributors').textContent=labels.contributors;if(start)start.text.textContent=labels.start;if(end)end.text.textContent=labels.end;if(tilesUnavailable)document.getElementById('status').textContent=labels.unavailable;};window.setHistoryLabels(labels);
window.selectHistoryPoint=function(p){selected=p;drawSelection();};document.getElementById('plus').onclick=function(){zoom=Math.min(19,zoom+1);draw();};document.getElementById('minus').onclick=function(){zoom=Math.max(1,zoom-1);draw();};document.getElementById('fit').onclick=fit;
var drag=null;map.onpointerdown=function(e){if(e.target.closest('button,a'))return;drag=[e.clientX,e.clientY,cx,cy];map.setPointerCapture(e.pointerId);};map.onpointermove=function(e){if(!drag)return;var scale=256*Math.pow(2,zoom);cx=drag[2]-(e.clientX-drag[0])/scale;cy=Math.max(0,Math.min(1,drag[3]-(e.clientY-drag[1])/scale));draw();};map.onpointerup=map.onpointercancel=function(){drag=null;};window.onresize=fit;fit();if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
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
    <View style={[local.frame, style]}>
      <WebView<object>
        ref={web}
        style={local.map}
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
        onMessage={event => {
          try {
            if (JSON.parse(event.nativeEvent.data).type === 'ready') {
              updateMarker();
              updateLabels();
            }
          } catch {
            /* Ignore malformed bridge messages. */
          }
        }}
        javaScriptEnabled
        domStorageEnabled={false}
        cacheEnabled
        userAgent="PathSathi-Android/1.0 (com.pathsathi.transport)"
        allowFileAccess={false}
        mixedContentMode="never"
        setSupportMultipleWindows={false}
      />
    </View>
  );
}
const local = StyleSheet.create({
  frame: {
    height: 360,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DCE9E3',
    backgroundColor: '#E8F0EC',
  },
  map: { flex: 1, backgroundColor: '#E8F0EC' },
});
