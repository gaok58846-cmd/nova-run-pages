import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [css,game,ui,config,storage,player,mountain,tide,sand]=await Promise.all([
  readFile(new URL('../styles.css',import.meta.url),'utf8'),
  readFile(new URL('../game.js',import.meta.url),'utf8'),
  readFile(new URL('../ui.js',import.meta.url),'utf8'),
  readFile(new URL('../config.js',import.meta.url),'utf8'),
  readFile(new URL('../storage.js',import.meta.url),'utf8'),
  readFile(new URL('../player.js',import.meta.url),'utf8'),
  readFile(new URL('../mountain-map.js',import.meta.url),'utf8'),
  readFile(new URL('../tide-city-map.js',import.meta.url),'utf8'),
  readFile(new URL('../sand-clock-map.js',import.meta.url),'utf8')
]);

assert.match(css,/height:100dvh/,'dynamic viewport height protects mobile browser chrome');
assert.match(css,/min-width:48px[\s\S]*min-height:48px/,'primary touch targets keep a 48px minimum');
assert.match(css,/\.nr-touch \[data-act="dash"\]\{border-radius:16px!important\}/,'dash uses the shared rounded-square control language');
assert.match(css,/transform:none!important/,'low-height landscape menu cancels the legacy vertical transform');
assert.ok(!ui.includes('card.disabled=!open'),'locked map cards remain interactive');
assert.match(ui,/card\.dataset\.locked/,'map selection uses a single interactive locked-state path');
assert.match(game,/overReady=true/,'full energy exposes a NOVA-ready state before overload');
assert.match(game,/function activateOverdrive/,'overload has an explicit player activation path');
assert.match(game,/game\.diff==='easy'&&game\.rescueAvailable/,'only easy endless runs receive the one-use rescue');
assert.match(game,/if\(p\.shield>0\).*shieldRescue/,'a shield can rescue a pit fall');
assert.match(game,/if\(plan\.highlight\)/,'signature obstacle sequences announce a highlight moment');
assert.equal((config.match(/signature:Object\.freeze/g)||[]).length,6,'all endless scenes define a signature sequence');
assert.match(storage,/version:5/,'save migration includes PWA and fullscreen preferences');
assert.match(player,/drawChallenge/,'endless and challenge modes share the NOVA player renderer');
assert.equal((game.match(/PlayerRenderer\.drawChallenge/g)||[]).length,1,'the challenge loop owns exactly one unified player draw');
for(const [name,source] of [['dream peak',mountain],['tide city',tide],['sand clock',sand]])assert.doesNotMatch(source,/drawRunner|PlayerRenderer\.drawChallenge/,`${name} map renders world content without a duplicate runner`);
assert.match(game,/function drawActionCue\(o\)\{\s*if\(game\.diff!=='easy'\)return/,'endless action-answer arrows only render on easy difficulty');
assert.match(game,/function drawWarning\(o\)\{if\(!o\.warning/,'essential hazard warnings remain a separate all-difficulty path');
assert.match(game,/mountainInput=\{[^}]*autoRun:false/,'challenge movement defaults to fully manual control');
assert.match(game,/if\(globalThis\.PointerEvent\)[\s\S]*button\.addEventListener\('pointerdown'/,'mouse, pen, and touch share one Pointer Events control path');
assert.match(game,/else\{\s*const stopTouch=/,'older browsers retain a touch-event fallback');
assert.match(css,/@media\(pointer:coarse\)[\s\S]*data-mode="play"\] \.nr-touch\{display:grid!important\}/,'touch controls use the final ergonomic grid during play');
assert.match(css,/data-game-type="challenge"\] \.nr-touch \[data-act="slide"\]\{display:none!important\}/,'challenge hides the unused slide action');
assert.match(css,/@media\(pointer:fine\)\{#nova-run-game \.nr-touch\{display:none!important\}\}/,'desktop and keyboard devices remove touch controls from layout');
assert.match(css,/\.nr-icon-button\{[\s\S]*inline-size:var\(--nr-icon-size\)/,'settings close buttons share the rounded-square icon component');
assert.match(css,/\.nr-close-button>span:before,#nova-run-game \.nr-close-button>span:after/,'close icon uses two restrained custom strokes instead of a font glyph');
assert.match(css,/data-theme="light"\] \.nr-settings-heading\{[\s\S]*#f7f3ed[\s\S]*border-bottom-color:#ddd2c6/,'day settings header continues the warm paper surface');
assert.match(css,/data-theme="light"\] \.nr-panel-tabs\{[\s\S]*background:#ece5dc/,'day settings tabs avoid abrupt black bars');
assert.match(css,/data-theme="light"\] \.nr-icon-button[\s\S]*linear-gradient/,'day close button uses a warm editorial surface');
assert.match(game,/function disposeActiveSession\(\)[\s\S]*stopLoop\(\)[\s\S]*mountainState=null[\s\S]*things:\[\][\s\S]*particles:\[\]/,'mode switching fully disposes the active map, player effects, and render loop');
assert.match(game,/function clearInputState\(\)[\s\S]*autoRun:false/,'mode switching clears keyboard, pointer, and auto-run state');
assert.match(ui,/function resetTransient\(\)[\s\S]*clearTimeout\(toastTimer\)[\s\S]*closeSettings\(\{resume:false,consumeHistory:false\}\)/,'mode switching clears transient UI without resuming a disposed run');
assert.match(game,/const activeSession=game\.mode!=='menu';if\(activeSession\)disposeActiveSession\(\)/,'changing maps during play returns through a clean loading state');
for(const source of [mountain,tide,sand])assert.doesNotMatch(source,/[↑↓←→↥↧]/,'challenge maps contain no route or danger arrows');
assert.doesNotMatch(sand,/ctx\.arc\(WORLD_LENGTH|ctx\.fillRect\(WORLD_LENGTH|ctx\.arc\(state\.sandWaveX|ctx\.fillRect\(state\.sandWaveX/,'sand city no longer draws placeholder clock circles or debug-like sand-wave blocks');
assert.match(sand,/drawFinishGate\(ctx,state,height,FINISH/,'sand city uses the themed finish-gate renderer');

console.log('mobile, interaction, NOVA identity, and challenge-rating checks passed');
