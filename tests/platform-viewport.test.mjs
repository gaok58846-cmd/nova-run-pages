import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

test('stale visual viewport cannot keep the old portrait height after rotation',async()=>{
  const source=await readFile(new URL('../platform.js',import.meta.url),'utf8');
  const frames=[],properties={},classList={toggle(){}},media=()=>({matches:false,addEventListener(){}});
  const root={style:{setProperty(name,value){properties[name]=value}},dataset:{},classList,requestFullscreen:null};
  const context={
    console,
    Promise,
    Math,
    setTimeout,
    clearTimeout,
    innerWidth:390,
    innerHeight:844,
    screen:{width:390,height:844},
    visualViewport:{height:844,offsetTop:0,addEventListener(){}},
    navigator:{standalone:false,maxTouchPoints:0,userAgent:'test'},
    location:{protocol:'file:'},
    matchMedia:media,
    addEventListener(){},
    requestAnimationFrame(callback){frames.push(callback);return frames.length},
    document:{fullscreenElement:null,webkitFullscreenElement:null,addEventListener(){},documentElement:{clientHeight:844,classList},body:{classList}}
  };
  context.window=context;context.globalThis=context;
  vm.runInNewContext(source,context);
  const platform=context.NovaRunPlatform.create({root,storage:{settings:()=>({autoFullscreen:false})}});
  assert.equal(properties['--app-height'],'844px');
  context.innerWidth=844;context.innerHeight=390;context.screen={width:844,height:390};context.document.documentElement.clientHeight=390;
  // Some mobile browsers briefly report the old visualViewport height here.
  platform.scheduleViewport();
  for(let count=0;frames.length&&count<20;count++)frames.shift()(count*16);
  assert.equal(properties['--app-height'],'390px');
});
