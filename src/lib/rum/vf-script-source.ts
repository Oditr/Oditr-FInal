// ── VitalFix RUM — vf.js Script Source ──
// This file contains the source code for the vf.js monitoring script.
// It is served as a static JavaScript file or via an API route.
//
// Design principles:
//   - Async, non-blocking — never interferes with the host page
//   - < 3KB minified + gzipped
//   - No cookies, no PII, no cross-site tracking
//   - Uses PerformanceObserver for CWV collection
//   - Beacons data via sendBeacon (fallback: fetch)
//   - Wrapped entirely in try/catch — can never throw to host page

/**
 * Returns the vf.js monitoring script source code as a string.
 * The script is parameterized by siteId and endpoint URL.
 *
 * Usage:
 *   const script = getVfScriptSource('site_abc123', 'https://vitalfix.com/api/rum/collect')
 *   // Serve this string as application/javascript
 */
export function getVfScriptSource(siteId: string, endpoint: string): string {
  return `(function(w,d){'use strict';try{
var VF={v:'1.0',sid:'${siteId}',ep:'${endpoint}',q:[],s:null};

// ── Session ID (anonymous, per-page-load, no PII) ──
function gid(){var a=new Uint8Array(8);(w.crypto||w.msCrypto).getRandomValues(a);return Array.from(a,function(b){return('0'+b.toString(16)).slice(-2)}).join('')}
VF.s=gid();

// ── Device detection ──
function gdev(){
  var ua=navigator.userAgent||'';
  var t='desktop';
  if(/Mobi|Android|iPhone|iPod/i.test(ua))t='mobile';
  else if(/iPad|Tablet/i.test(ua))t='tablet';
  return{
    type:t,
    cores:navigator.hardwareConcurrency||undefined,
    memory:navigator.deviceMemory||undefined
  };
}

// ── Network info ──
function gnet(){
  var c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  if(!c)return{effectiveType:'unknown'};
  return{
    effectiveType:c.effectiveType||'unknown',
    downlink:c.downlink||undefined,
    rtt:c.rtt||undefined
  };
}

// ── Rate metric ──
function rate(name,val){
  if(name==='CLS'){
    if(val<=0.1)return'good';
    if(val<=0.25)return'needs-improvement';
    return'poor';
  }
  if(name==='INP'){
    if(val<=200)return'good';
    if(val<=500)return'needs-improvement';
    return'poor';
  }
  if(name==='LCP'){
    if(val<=2500)return'good';
    if(val<=4000)return'needs-improvement';
    return'poor';
  }
  if(name==='FCP'){
    if(val<=1800)return'good';
    if(val<=3000)return'needs-improvement';
    return'poor';
  }
  if(name==='TTFB'){
    if(val<=800)return'good';
    if(val<=1800)return'needs-improvement';
    return'poor';
  }
  return'good';
}

// ── Beacon sender ──
function send(){
  if(VF.q.length===0)return;
  var payload=JSON.stringify({
    siteId:VF.sid,
    sessionId:VF.s,
    route:w.location.pathname,
    url:w.location.href.split('?')[0],
    metrics:VF.q.slice(),
    device:gdev(),
    network:gnet(),
    version:VF.v,
    collectedAt:new Date().toISOString()
  });
  VF.q=[];
  if(navigator.sendBeacon){
    navigator.sendBeacon(VF.ep,payload);
  }else{
    fetch(VF.ep,{method:'POST',body:payload,keepalive:true}).catch(function(){});
  }
}

// ── Queue a metric ──
function push(name,value,navType){
  VF.q.push({name:name,value:Math.round(name==='CLS'?value*1000:value)/( name==='CLS'?1000:1),rating:rate(name,value),navigationType:navType||undefined});
}

// ── PerformanceObserver: LCP ──
if(typeof PerformanceObserver!=='undefined'){
  try{
    var lcpObs=new PerformanceObserver(function(l){
      var entries=l.getEntries();
      if(entries.length>0){
        var last=entries[entries.length-1];
        push('LCP',last.startTime,last.navigationType);
      }
    });
    lcpObs.observe({type:'largest-contentful-paint',buffered:true});
  }catch(e){}

  // ── FCP ──
  try{
    var fcpObs=new PerformanceObserver(function(l){
      var entries=l.getEntries();
      for(var i=0;i<entries.length;i++){
        if(entries[i].name==='first-contentful-paint'){
          push('FCP',entries[i].startTime);
          fcpObs.disconnect();
          break;
        }
      }
    });
    fcpObs.observe({type:'paint',buffered:true});
  }catch(e){}

  // ── CLS ──
  try{
    var clsVal=0;
    var clsObs=new PerformanceObserver(function(l){
      var entries=l.getEntries();
      for(var i=0;i<entries.length;i++){
        if(!entries[i].hadRecentInput){
          clsVal+=entries[i].value;
        }
      }
    });
    clsObs.observe({type:'layout-shift',buffered:true});
    // Report CLS on page hide
    var clsReported=false;
    function reportCls(){
      if(clsReported)return;
      clsReported=true;
      push('CLS',clsVal);
    }
    d.addEventListener('visibilitychange',function(){
      if(d.visibilityState==='hidden')reportCls();
    });
    w.addEventListener('pagehide',reportCls);
  }catch(e){}

  // ── INP ──
  try{
    var inpVal=0;
    var inpObs=new PerformanceObserver(function(l){
      var entries=l.getEntries();
      for(var i=0;i<entries.length;i++){
        var dur=entries[i].duration;
        if(dur>inpVal)inpVal=dur;
      }
    });
    inpObs.observe({type:'event',buffered:true,durationThreshold:16});
    var inpReported=false;
    function reportInp(){
      if(inpReported||inpVal===0)return;
      inpReported=true;
      push('INP',inpVal);
    }
    d.addEventListener('visibilitychange',function(){
      if(d.visibilityState==='hidden')reportInp();
    });
    w.addEventListener('pagehide',reportInp);
  }catch(e){}
}

// ── TTFB (from Navigation Timing API) ──
try{
  var navEntry=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];
  if(navEntry&&navEntry.responseStart>0){
    push('TTFB',navEntry.responseStart);
  }
}catch(e){}

// ── Send beacon on page unload ──
d.addEventListener('visibilitychange',function(){
  if(d.visibilityState==='hidden')send();
});
w.addEventListener('pagehide',send);

// ── Delayed send as fallback (in case visibilitychange never fires) ──
setTimeout(function(){send()},30000);

// ── Route change detection (SPA support) ──
var origPush=w.history&&w.history.pushState;
if(origPush){
  w.history.pushState=function(){
    send();
    origPush.apply(w.history,arguments);
    VF.s=gid();
  };
  w.addEventListener('popstate',function(){
    send();
    VF.s=gid();
  });
}

}catch(e){/* vf.js: silent failure — never break host page */}
})(window,document);`
}

/**
 * Returns a minified version of the vf.js script.
 * In production, this would be pre-minified at build time.
 * For now, the script is already written in a compact style.
 */
export function getVfScriptMinified(siteId: string, endpoint: string): string {
  // The script source is already written in a compact/minified style
  return getVfScriptSource(siteId, endpoint)
}
