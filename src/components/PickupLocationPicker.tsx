import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../theme';

const DEFAULT_DHAKA = { latitude: 23.8103, longitude: 90.4125 };

const scriptData = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

function validPoint(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/**
 * A small self-contained OSM picker. It deliberately does not load third-party
 * scripts: only map tiles leave the app, and a tap sends latitude/longitude
 * straight back over the WebView bridge.
 */
export function pickupLocationPickerHtml(initial: {
  latitude: number;
  longitude: number;
}) {
  const point = validPoint(initial.latitude, initial.longitude)
    ? initial
    : DEFAULT_DHAKA;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src https://tile.openstreetmap.org;"><style>
html,body,#map{margin:0;width:100%;height:100%;overflow:hidden;background:#e6eee8;font-family:system-ui}#map{position:relative;touch-action:none}#tiles{position:absolute;inset:0}#tiles img{position:absolute;width:256px;height:256px}.pin{position:absolute;width:22px;height:22px;border:3px solid white;border-radius:50% 50% 50% 0;background:${
    colors.primary
  };box-shadow:0 2px 7px #18343b55;transform:translate(-50%,-100%) rotate(-45deg);pointer-events:none}.pin:after{content:'';position:absolute;width:7px;height:7px;border-radius:50%;background:white;top:5px;left:5px}button{position:absolute;right:10px;width:40px;height:40px;background:#fff;color:${
    colors.primary
  };border:1px solid #d8e5e1;border-radius:10px;font-size:22px;font-weight:bold;box-shadow:0 2px 6px #18343b22}#plus{top:10px}#minus{top:56px}#credit{position:absolute;right:0;bottom:0;padding:3px 5px;background:#fffffff0;color:#53615b;font-size:10px;pointer-events:none}</style></head><body><div id="map"><div id="tiles"></div><div id="pin" class="pin"></div><button id="plus" aria-label="Zoom in">+</button><button id="minus" aria-label="Zoom out">−</button><div id="credit">© OpenStreetMap contributors</div></div><script>
(function(){'use strict';var point=${scriptData(point)},zoom=15,cx=0,cy=0,drag=null,map=document.getElementById('map'),tiles=document.getElementById('tiles'),pin=document.getElementById('pin');
function project(p){var lat=Math.max(-85.0511,Math.min(85.0511,p.latitude))*Math.PI/180;return [(p.longitude+180)/360,(1-Math.log(Math.tan(lat)+1/Math.cos(lat))/Math.PI)/2];}
function unproject(x,y){x=x-Math.floor(x);var lng=x*360-180,n=Math.PI-2*Math.PI*y;return {latitude:180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n))),longitude:lng};}
function pinPoint(){var q=project(point),scale=256*Math.pow(2,zoom),dx=q[0]-cx;dx-=Math.round(dx);pin.style.left=(dx*scale+map.clientWidth/2)+'px';pin.style.top=((q[1]-cy)*scale+map.clientHeight/2)+'px';}
function draw(){var count=Math.pow(2,zoom),scale=256*count,left=cx*scale-map.clientWidth/2,top=cy*scale-map.clientHeight/2,used={};for(var x=Math.floor(left/256);x<=Math.floor((left+map.clientWidth)/256);x++)for(var y=Math.floor(top/256);y<=Math.floor((top+map.clientHeight)/256);y++){if(y<0||y>=count)continue;var key=zoom+'-'+x+'-'+y;used[key]=true;var image=document.getElementById(key);if(!image){image=document.createElement('img');image.id=key;image.alt='';image.draggable=false;image.src='https://tile.openstreetmap.org/'+zoom+'/'+((x%count+count)%count)+'/'+y+'.png';tiles.appendChild(image);}image.style.left=(x*256-left)+'px';image.style.top=(y*256-top)+'px';}Array.from(tiles.children).forEach(function(node){if(!used[node.id])node.remove();});pinPoint();}
function select(clientX,clientY){var scale=256*Math.pow(2,zoom),worldX=(cx*scale-map.clientWidth/2+clientX)/scale,worldY=(cy*scale-map.clientHeight/2+clientY)/scale;point=unproject(worldX,worldY);draw();if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:'pick',latitude:point.latitude,longitude:point.longitude}));}
function center(){var q=project(point);cx=q[0];cy=q[1];draw();}document.getElementById('plus').onclick=function(){zoom=Math.min(19,zoom+1);draw();};document.getElementById('minus').onclick=function(){zoom=Math.max(2,zoom-1);draw();};map.onpointerdown=function(e){if(e.target.closest('button'))return;drag=[e.clientX,e.clientY,cx,cy];map.setPointerCapture(e.pointerId);};map.onpointermove=function(e){if(!drag)return;var scale=256*Math.pow(2,zoom);cx=drag[2]-(e.clientX-drag[0])/scale;cy=Math.max(0,Math.min(1,drag[3]-(e.clientY-drag[1])/scale));draw();};map.onpointerup=map.onpointercancel=function(e){if(!drag)return;var moved=Math.hypot(e.clientX-drag[0],e.clientY-drag[1]);drag=null;if(moved<8)select(e.clientX,e.clientY);};window.onresize=draw;center();})();</script></body></html>`;
}

export function PickupLocationPicker({
  latitude,
  longitude,
  onPick,
}: {
  latitude: number;
  longitude: number;
  onPick: (point: { latitude: number; longitude: number }) => void;
}) {
  const source = useMemo(
    () => ({
      html: pickupLocationPickerHtml({ latitude, longitude }),
      baseUrl: 'https://pathsathi.local/',
    }),
    [latitude, longitude],
  );
  return (
    <View style={ui.container}>
      <WebView<object>
        accessibilityLabel="Pickup location map"
        style={ui.map}
        source={source}
        originWhitelist={['https://pathsathi.local']}
        onShouldStartLoadWithRequest={request =>
          request.url === 'about:blank' ||
          request.url === 'https://pathsathi.local/'
        }
        onMessage={event => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (
              message.type === 'pick' &&
              validPoint(message.latitude, message.longitude)
            )
              onPick({
                latitude: message.latitude,
                longitude: message.longitude,
              });
          } catch {
            /* Ignore malformed messages from the embedded map. */
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
    </View>
  );
}

const ui = StyleSheet.create({
  container: {
    height: 250,
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  map: { flex: 1, backgroundColor: '#E6EEE8' },
});
