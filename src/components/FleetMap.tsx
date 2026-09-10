import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Location, Vehicle } from '../api/types';
import { useTranslation } from '../i18n';
import { colors } from '../theme';

export interface FleetMapProps {
  vehicles: Vehicle[];
  locations: Location[];
  selectedId?: string;
  onSelect: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

export function hasMapPosition(location?: Location): location is Location & {
  latitude: number;
  longitude: number;
} {
  return (
    typeof location?.latitude === 'number' &&
    typeof location.longitude === 'number' &&
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    Math.abs(location.latitude) <= 90 &&
    Math.abs(location.longitude) <= 180
  );
}

export function fleetMapMarkers(vehicles: Vehicle[], locations: Location[]) {
  const byImei = new Map(locations.map(location => [location.imei, location]));
  return vehicles.flatMap(vehicle => {
    const location = byImei.get(vehicle.imei);
    if (!hasMapPosition(location)) return [];
    return [
      {
        id: vehicle.id,
        name: vehicle.name,
        latitude: location.latitude,
        longitude: location.longitude,
        live:
          location.status === 'live' &&
          Date.now() - Date.parse(location.lastSeen) < 180_000,
      },
    ];
  });
}

// Never allow vehicle names or identifiers to terminate an inline script.
const scriptData = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

// Like HistoryMap, this renderer is bundled locally. Only raster map tiles
// leave the device; no remote JavaScript, tracker identifiers, or credentials.
export function fleetMapHtml(
  markers: ReturnType<typeof fleetMapMarkers> = [],
  selectedId?: string,
) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https://tile.openstreetmap.org;"><style>
html,body,#map{margin:0;width:100%;height:100%;overflow:hidden;background:#e8efed;font-family:system-ui}#map{position:relative;touch-action:none}#tiles,#markers{position:absolute;inset:0}#tiles img{position:absolute;width:256px;height:256px}#markers{pointer-events:none}.marker{position:absolute;transform:translate(-50%,-50%);width:44px;height:44px;border:3px solid white;border-radius:15px;background:${
    colors.muted
  };color:white;box-shadow:0 3px 10px #18343b35;pointer-events:auto;display:flex;align-items:center;justify-content:center}.marker.live{background:${
    colors.primary
  }}.marker.selected{background:${
    colors.primary
  };outline:7px solid #087f7828;z-index:2}.marker svg{width:24px;height:24px}.marker span{position:absolute;top:52px;left:50%;transform:translateX(-50%);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border-radius:7px;background:white;color:${
    colors.ink
  };font-size:12px;font-weight:600;padding:5px 9px;box-shadow:0 2px 6px #18343b15;pointer-events:none}#credit{position:absolute;bottom:0;left:0;background:#ffffffed;padding:3px 6px;font-size:10px;color:${
    colors.muted
  };pointer-events:none}
</style></head><body><div id="map"><div id="tiles"></div><div id="markers"></div><div id="credit">© OpenStreetMap <span id="contributors">contributors</span></div></div><script>
(function(){'use strict';
var items=${scriptData(markers)},selected=${scriptData(
    selectedId || null,
  )},zoom=14,cx=0.5,cy=0.5,initialized=false,tileError=false;
var map=document.getElementById('map'),tiles=document.getElementById('tiles'),layer=document.getElementById('markers');
function send(type,id){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:type,id:id}));}
function project(p){var lat=Math.max(-85.0511,Math.min(85.0511,p.latitude))*Math.PI/180;return [(p.longitude+180)/360,(1-Math.log(Math.tan(lat)+1/Math.cos(lat))/Math.PI)/2];}
function selectedItem(){return items.find(function(p){return p.id===selected;});}
function fit(){if(!items.length){draw();return;}var ps=items.map(project),xs=ps.map(function(p){return p[0];}),ys=ps.map(function(p){return p[1];});var l=Math.min.apply(null,xs),r=Math.max.apply(null,xs),t=Math.min.apply(null,ys),b=Math.max.apply(null,ys);cx=(l+r)/2;cy=(t+b)/2;zoom=Math.max(1,Math.min(16,Math.floor(Math.log2(Math.min(Math.max(1,map.clientWidth-120)/(256*Math.max(r-l,0.00001)),Math.max(1,map.clientHeight-150)/(256*Math.max(b-t,0.00001)))))));initialized=true;draw();}
function focus(){var p=selectedItem();if(!p){fit();return;}var q=project(p);cx=q[0];cy=q[1];zoom=16;initialized=true;draw();}
function draw(){if(!items.length){tiles.replaceChildren();layer.replaceChildren();return;}var count=Math.pow(2,zoom),scale=256*count,left=cx*scale-map.clientWidth/2,top=cy*scale-map.clientHeight/2,used={};
for(var x=Math.floor(left/256);x<=Math.floor((left+map.clientWidth)/256);x++)for(var y=Math.floor(top/256);y<=Math.floor((top+map.clientHeight)/256);y++){if(y<0||y>=count)continue;var key='tile-'+zoom+'-'+x+'-'+y;used[key]=true;var im=document.getElementById(key);if(!im){im=document.createElement('img');im.id=key;im.alt='';im.draggable=false;im.onerror=function(){if(!tileError){tileError=true;send('tileError');}};im.src='https://tile.openstreetmap.org/'+zoom+'/'+((x%count+count)%count)+'/'+y+'.png';tiles.appendChild(im);}im.style.left=(x*256-left)+'px';im.style.top=(y*256-top)+'px';}
Array.from(tiles.children).forEach(function(e){if(!used[e.id])e.remove();});layer.replaceChildren();items.forEach(function(p){var q=project(p),dx=q[0]-cx;dx-=Math.round(dx);var px=dx*scale+map.clientWidth/2,py=(q[1]-cy)*scale+map.clientHeight/2;if(px<-160||px>map.clientWidth+160||py<-70||py>map.clientHeight+70)return;var button=document.createElement('button');button.className='marker'+(p.live?' live':'')+(p.id===selected?' selected':'');button.dataset.vehicleId=p.id;button.style.left=px+'px';button.style.top=py+'px';button.setAttribute('aria-label',p.label||p.name);button.setAttribute('aria-pressed',String(p.id===selected));button.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M5 10l2-5h10l2 5M4 10h16v9H4zM7 19v2m10-2v2M4 14h16"/><path d="M7 12h1m8 0h1"/></svg>';if(p.id===selected){var name=document.createElement('span');name.textContent=p.name;button.appendChild(name);}button.onclick=function(){selected=p.id;focus();send('select',p.id);};layer.appendChild(button);});}
window.setFleetData=function(next,id){var changed=selected!==id;items=next;selected=id;if(!initialized||changed){if(selectedItem())focus();else fit();}else draw();};
window.setFleetLabels=function(labels){document.documentElement.lang=labels.language;document.getElementById('contributors').textContent=labels.contributors;};
window.fleetAction=function(action){if(action==='fit')fit();else if(action==='focus')focus();else{zoom=Math.max(1,Math.min(19,zoom+(action==='in'?1:-1)));draw();}};
var pointers=new Map(),drag=null,pinch=null;
map.onpointerdown=function(e){if(e.target.closest('button'))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);map.setPointerCapture(e.pointerId);if(pointers.size===1)drag=[e.clientX,e.clientY,cx,cy];if(pointers.size===2){var ps=Array.from(pointers.values());pinch=[Math.hypot(ps[0][0]-ps[1][0],ps[0][1]-ps[1][1]),zoom];drag=null;}};
map.onpointermove=function(e){if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pinch&&pointers.size===2){var ps=Array.from(pointers.values()),distance=Math.hypot(ps[0][0]-ps[1][0],ps[0][1]-ps[1][1]);zoom=Math.max(1,Math.min(19,Math.round(pinch[1]+Math.log2(Math.max(1,distance)/Math.max(1,pinch[0])))));draw();}else if(drag){var scale=256*Math.pow(2,zoom);cx=drag[2]-(e.clientX-drag[0])/scale;cy=Math.max(0,Math.min(1,drag[3]-(e.clientY-drag[1])/scale));draw();}};
map.onpointerup=map.onpointercancel=function(e){pointers.delete(e.pointerId);pinch=null;drag=null;};map.onwheel=function(e){e.preventDefault();window.fleetAction(e.deltaY<0?'in':'out');};window.onresize=draw;if(selectedItem())focus();else fit();send('ready');
})();</script></body></html>`;
}

export function FleetMap({
  vehicles,
  locations,
  selectedId,
  onSelect,
  style,
}: FleetMapProps) {
  const { t, i18n } = useTranslation();
  const web = useRef<WebView<object>>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [revision, setRevision] = useState(0);
  const markers = useMemo(
    () => fleetMapMarkers(vehicles, locations),
    [vehicles, locations],
  );
  const source = useMemo(
    () => ({ html: fleetMapHtml(), baseUrl: 'https://pathsathi.local/' }),
    [],
  );
  const positioned = markers.some(marker => marker.id === selectedId);
  const update = () => {
    const labelled = markers.map(marker => ({
      ...marker,
      label: t('Select {{name}}', { name: marker.name }),
    }));
    web.current?.injectJavaScript(
      `window.setFleetData && window.setFleetData(${scriptData(
        labelled,
      )},${scriptData(
        selectedId || null,
      )});window.setFleetLabels && window.setFleetLabels(${scriptData({
        language: i18n.language,
        contributors: t('contributors'),
      })});true;`,
    );
  };
  useEffect(update, [markers, selectedId, i18n.language, t]);
  const retry = () => {
    setLoading(true);
    setFailed(false);
    setTileError(false);
    setRevision(value => value + 1);
  };
  const action = (name: string) =>
    web.current?.injectJavaScript(
      `window.fleetAction && window.fleetAction(${scriptData(name)});true;`,
    );
  return (
    <View style={[local.container, style]}>
      <WebView<object>
        key={revision}
        ref={web}
        accessibilityLabel={t('Fleet map')}
        style={local.web}
        source={source}
        originWhitelist={['https://pathsathi.local']}
        onShouldStartLoadWithRequest={request =>
          request.url === 'about:blank' ||
          request.url === 'https://pathsathi.local/'
        }
        onLoadEnd={update}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
        onContentProcessDidTerminate={retry}
        onRenderProcessGone={() => {
          setLoading(false);
          setFailed(true);
        }}
        onMessage={event => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'ready') {
              setLoading(false);
              update();
            }
            if (message.type === 'tileError') setTileError(true);
            if (
              message.type === 'select' &&
              typeof message.id === 'string' &&
              markers.some(marker => marker.id === message.id)
            )
              onSelect(message.id);
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
        scrollEnabled={false}
      />
      {failed || !markers.length ? (
        <View style={local.empty}>
          <View style={local.locationGlyph}>
            <View style={local.locationDot} />
          </View>
          <Text style={local.emptyTitle}>
            {failed ? t('Map unavailable') : t('No vehicle locations yet')}
          </Text>
          {failed ? (
            <Pressable
              accessibilityRole="button"
              onPress={retry}
              style={local.retry}
            >
              <Text style={local.retryText}>{t('Retry map')}</Text>
            </Pressable>
          ) : (
            <Text style={local.emptyText}>
              {t('Locations appear when a tracker reports its position.')}
            </Text>
          )}
        </View>
      ) : (
        <>
          {loading ? (
            <View pointerEvents="none" style={local.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={local.noticeText}>{t('Loading map…')}</Text>
            </View>
          ) : null}
          {selectedId && !positioned ? (
            <View pointerEvents="none" style={local.notice}>
              <Text style={local.noticeText}>
                {t('No position for this vehicle')}
              </Text>
            </View>
          ) : null}
          <View style={local.controls}>
            <MapControl
              label={t('Zoom in')}
              symbol="+"
              onPress={() => action('in')}
            />
            <MapControl
              label={t('Zoom out')}
              symbol="−"
              onPress={() => action('out')}
            />
            <MapControl
              label={t('Fit all vehicles')}
              symbol="⊞"
              onPress={() => action('fit')}
            />
            {positioned ? (
              <MapControl
                label={t('Recenter vehicle')}
                symbol="◎"
                onPress={() => action('focus')}
              />
            ) : null}
          </View>
          {tileError ? (
            <View style={local.tileNotice}>
              <Text style={local.tileText}>
                {t('Map tiles unavailable. Vehicle positions remain visible.')}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={retry}
                style={local.tileRetry}
              >
                <Text style={local.retryText}>{t('Retry map')}</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

function MapControl({
  label,
  symbol,
  onPress,
}: {
  label: string;
  symbol: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [local.control, pressed && local.pressed]}
    >
      <Text accessible={false} style={local.controlText}>
        {symbol}
      </Text>
    </Pressable>
  );
}

const local = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 180,
    backgroundColor: '#E8EFED',
    overflow: 'hidden',
  },
  web: { flex: 1, backgroundColor: '#E8EFED' },
  controls: {
    position: 'absolute',
    right: 16,
    bottom: 32,
    width: 94,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  control: {
    width: 44,
    height: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  controlText: { color: colors.primary, fontSize: 25, lineHeight: 30 },
  pressed: { opacity: 0.65 },
  empty: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
    backgroundColor: '#E8EFED',
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 250,
  },
  locationGlyph: {
    width: 46,
    height: 46,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  locationDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.primary,
  },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16 },
  retryText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  loading: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  notice: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  noticeText: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  tileNotice: {
    position: 'absolute',
    left: 12,
    right: 122,
    bottom: 24,
    paddingLeft: 12,
    paddingRight: 8,
    paddingTop: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  tileText: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  tileRetry: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
});
