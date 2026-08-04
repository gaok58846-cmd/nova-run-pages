import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=name=>readFile(new URL(`../${name}`,import.meta.url),'utf8');

test('adaptive rendering uses stable hysteresis instead of frame-to-frame toggling',async()=>{
  const game=await read('game.js');
  assert.match(game,/frameTimeEma=16\.7/);
  assert.match(game,/function updateAdaptiveQuality\(rawDt\)/);
  assert.match(game,/qualityPressure>=45/);
  assert.match(game,/qualityRecovery>=240/);
  assert.doesNotMatch(game,/slowFrameScore/);
});

test('hot render and audio resources are cached',async()=>{
  const [game,backgrounds,audio]=await Promise.all([read('game.js'),read('backgrounds.js'),read('audio.js')]);
  const track=game.slice(game.indexOf('function track('),game.indexOf('function sceneAtmosphere('));
  assert.match(track,/linearGradient\(/);
  assert.doesNotMatch(track,/ctx\.createLinearGradient/);
  assert.match(backgrounds,/waterGradient/);
  assert.match(backgrounds,/reflectionGradient/);
  assert.equal((audio.match(/context\.createBuffer\(/g)||[]).length,1);
  assert.match(audio,/if\(!noiseBuffer\)/);
});

test('challenge scenes reuse sky gradients and respect render quality',async()=>{
  const [mountain,tide,sand,engine]=await Promise.all([
    read('mountain-map.js'),read('tide-city-map.js'),read('sand-clock-map.js'),read('challenge-engine.js')
  ]);
  for(const source of [mountain,tide,sand]){
    assert.match(source,/_skyKey/);
    assert.match(source,/_skyGradient/);
  }
  assert.match(mountain,/renderQuality/);
  assert.match(engine,/renderQuality/);
});

test('orientation changes settle safely and every game frame starts clean',async()=>{
  const [platform,game,player]=await Promise.all([read('platform.js'),read('game.js'),read('player.js')]);
  assert.match(platform,/Math\.min\(layoutHeight,visualHeight\)/);
  assert.match(platform,/function settleViewport\(\)/);
  assert.match(platform,/viewportSettle=Math\.max\(viewportSettle,10\)/);
  assert.match(game,/function render\(\)\{ctx\.clearRect\(0,0,W,H\)/);
  assert.match(game,/game\.hitStop=reducedMotion\?\.018/);
  assert.match(player,/landing=Math\.min/);
  assert.match(player,/takeoff=Math\.min/);
  assert.match(player,/impact=Math\.min/);
});
