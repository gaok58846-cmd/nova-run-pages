import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=name=>fs.readFileSync(new URL(`../${name}`,import.meta.url),'utf8');
const html=read('index.html'),css=read('styles.css'),selectMenu=read('select-menu.js'),platform=read('platform.js'),player=read('player.js'),config=read('config.js'),storage=read('storage.js'),game=read('game.js'),stateEffects=read('state-effects.js'),ui=read('ui.js'),sw=read('sw.js');
const manifest=JSON.parse(read('manifest.webmanifest'));

assert.equal((html.match(/<select\b/g)||[]).length,6,'the project retains exactly six native compatibility selects');
assert.equal((html.match(/data-custom-select/g)||[]).length,4,'language, theme, difficulty, and performance use the shared selector');
assert.equal((html.match(/data-select-mode="cards"/g)||[]).length,2,'scene and skin selects are driven by illustrated cards');
assert.equal((selectMenu.match(/createElement\(['"]select['"]\)/g)||[]).length,0,'no player-visible select is created dynamically');
assert.match(css,/\.nr-native-select\{display:none!important;pointer-events:none!important\}/,'native selects cannot receive pointer input');
assert.match(selectMenu,/aria-haspopup/,'custom triggers expose listbox semantics');
assert.match(selectMenu,/setAttribute\('role','option'\)/,'custom options expose option semantics');
assert.match(selectMenu,/new Event\('input',\{bubbles:true\}\)[\s\S]*new Event\('change',\{bubbles:true\}\)/,'selection preserves legacy input and change paths');
assert.match(selectMenu,/MutationObserver/,'dynamic options and translations are refreshed');
assert.match(selectMenu,/popstate/,'Android back closes the active selector');
assert.match(css,/\.nr-select-option\[aria-selected="true"\]/,'selected options use the NOVA visual state');
assert.match(css,/data-theme="light"\] \.nr-select-option/,'the selector has a day theme');

assert.equal((html.match(/data-skin-card=/g)||[]).length,5,'five dedicated skin cards are present');
assert.equal((config.match(/pattern:'(?:nova|pulse|sunset|prism|aurora)'/g)||[]).length,5,'all skins have a distinct visual pattern');
assert.match(player,/function drawPreview/,'previews reuse the live player renderer');
assert.match(player,/S\.pattern==='pulse'/);assert.match(player,/S\.pattern==='prism'/);assert.match(player,/S\.pattern==='aurora'/);
assert.match(storage,/autoFullscreen:true/);assert.match(storage,/iosInstallDismissed:false/);

assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');assert.equal(manifest.orientation,'any');
assert.equal(manifest.icons.length,3);
for(const [file,size] of [['icon-192.png',192],['icon-512.png',512],['icon-maskable-512.png',512],['apple-touch-icon.png',180]]){
  const data=fs.readFileSync(new URL(`../assets/icons/${file}`,import.meta.url));
  assert.equal(data.readUInt32BE(16),size,`${file} width`);assert.equal(data.readUInt32BE(20),size,`${file} height`);
}
assert.match(html,/apple-mobile-web-app-status-bar-style" content="black-translucent"/);
assert.match(html,/rel="manifest" href="\.\/manifest\.webmanifest"/);
assert.match(platform,/visualViewport/);assert.match(platform,/tryEnterFullscreenFromGesture/);assert.match(platform,/isStandalone/);
assert.match(platform,/isBrowserFullscreen/,'F11-style browser fullscreen is detected independently of the Fullscreen API');
assert.match(platform,/dataset\.immersive/,'immersive state reaches the root layout');
{
  const rootClasses=new Set(),htmlClasses=new Set(),bodyClasses=new Set();
  const classList=set=>({toggle(name,on){on?set.add(name):set.delete(name)}});
  const root={style:{setProperty(){}},dataset:{},classList:classList(rootClasses)};
  const context={console,screen:{width:1920,height:1080},innerWidth:1920,innerHeight:1080,location:{protocol:'file:'},navigator:{standalone:false,maxTouchPoints:0},document:{fullscreenElement:null,webkitFullscreenElement:null,documentElement:{classList:classList(htmlClasses)},body:{classList:classList(bodyClasses)},addEventListener(){}},matchMedia:query=>({matches:false,addEventListener(){}}),addEventListener(){},requestAnimationFrame:callback=>{callback();return 1}};
  context.window=context;context.globalThis=context;
  vm.runInNewContext(platform,context);
  const service=context.NovaRunPlatform.create({root,storage:{settings:()=>({autoFullscreen:false})}});
  assert.equal(service.isBrowserFullscreen(),true,'screen-sized browser windows are recognized as F11 fullscreen');
  assert.equal(root.dataset.immersive,'true');assert.ok(rootClasses.has('is-immersive'));assert.ok(htmlClasses.has('nr-immersive'));assert.ok(bodyClasses.has('nr-immersive'));
}
assert.match(platform,/register\('\.\/sw\.js',\{scope:'\.\/',updateViaCache:'none'\}\)/,'service worker uses the GitHub Pages subpath scope');
assert.match(sw,/request\.mode==='navigate'/);assert.match(sw,/cache:'no-store'/);assert.doesNotMatch(sw,/cache\.put\([^\n]*response\)(?!\.clone)/);
assert.ok(html.includes('2026-07-23-mobile-pwa12')&&sw.includes("BUILD='2026-07-23-mobile-pwa12'"),'page and service worker share one build id');

assert.match(css,/--safe-top:env\(safe-area-inset-top/);assert.match(css,/--app-height/);assert.match(css,/--visual-bottom-offset/);
assert.match(css,/#nova-run-game\.is-immersive,[^}]*border-radius:0!important/,'immersive layouts cannot reveal rounded corner gaps');
assert.equal((html.match(/\bnr-icon-button\b/g)||[]).length,11,'seven close buttons and four icon shortcuts share one component after removing the blocking pause dialog');
assert.match(css,/\.nr-icon-button\{[\s\S]*border-radius:var\(--nr-icon-radius\)!important/,'icon buttons are rounded squares');
assert.doesNotMatch(css,/\.nr-quick-controls \.btn\{[^}]*border-radius:50%/,'quick controls are no longer circular');
assert.doesNotMatch(css,/\.nr-touch \[data-act="dash"\]\{[^}]*border-radius:50%/,'dash is no longer circular');
assert.doesNotMatch(css,/\.nr-panel-close/,'obsolete circular close-button rules were removed');
assert.match(css,/settings-open \.nr-toolbar\{[^}]*flex-wrap:nowrap!important;align-items:stretch!important/,'settings header and content cannot wrap into accidental desktop columns');
assert.match(css,/@media\(min-width:901px\) and \(min-height:600px\)[\s\S]*width:min\(920px[\s\S]*height:min\(650px/,'desktop settings use a compact centered console');
assert.match(css,/data-settings-page="settings"\] \.nr-toolbar\{height:min\(520px/,'desktop settings do not stretch short content into a blank full-height panel');
assert.match(html,/class="nr-controls-help"[^>]*aria-describedby="nr-controls-help-tip"[^>]*aria-expanded="false"/,'desktop controls help is a semantic button');
assert.match(html,/id="nr-controls-help-tip" role="tooltip" data-menu-controls/,'translated control text is exposed through a custom tooltip');
assert.match(css,/@media\(hover:hover\) and \(pointer:fine\)\{#nova-run-game \.nr-controls-help-wrap\{display:flex\}\}/,'the dot is enabled only for precise hover devices');
assert.match(css,/@media\(hover:none\),\(pointer:coarse\)[\s\S]*nr-controls-help-wrap\{display:none!important;height:0!important;margin:0!important;pointer-events:none!important/,'touch devices remove the help entry and its layout space');
assert.match(game,/controlsHelpTrigger\.addEventListener\('keydown',[\s\S]*event\.key==='Escape'[\s\S]*controlsHelpTrigger\.blur/,'Escape closes the keyboard tooltip');
assert.match(css,/\.nr-panel-tabs button\{min-height:48px;font-size:15px;font-weight:800/,'mobile settings tabs use readable typography');
assert.match(css,/\.nr-scene-copy strong\{min-height:2\.5em;font-size:14px[\s\S]*-webkit-line-clamp:2/,'mobile map names are larger and may wrap to two lines');
assert.match(css,/\.nr-skin-card small\{[\s\S]*font-size:11px[\s\S]*-webkit-line-clamp:3/,'skin descriptions no longer use micro text');
assert.match(css,/\.nr-field-title\{font-size:14px[\s\S]*\.nr-select-trigger\{font-size:15px/,'settings labels and custom values share the larger scale');
assert.match(css,/@media\(min-width:901px\) and \(min-height:600px\)[\s\S]*\.nr-panel-tabs button\{min-height:46px;font-size:16px\}[\s\S]*\.nr-character-copy strong\{font-size:28px\}/,'desktop tabs and character focus use the larger hierarchy');
assert.doesNotMatch(html,/data-pause-panel|data-pause-resume/,'the blocking central resume dialog is removed');
assert.match(html,/class="nr-settings-backdrop"[^>]*data-settings-backdrop/,'mobile settings have a dedicated outside-tap target');
assert.match(html,/class="nr-pause-status"[^>]*data-pause-status/,'manual pause uses a compact non-interactive status');
assert.match(ui,/function modalState\([\s\S]*actions\.modalOpen[\s\S]*actions\.modalClose/,'UI modal transitions own pause and resume state');
assert.match(ui,/function handleBack\(\)[\s\S]*selectMenu\?\.open[\s\S]*settings-open[\s\S]*resume:true/,'back handling closes selectors before settings and resumes');
assert.match(game,/if\(e\.defaultPrevented\)return;[\s\S]*appUi&&appUi\.handleBack/,'game shortcuts respect modal keyboard handling');
assert.match(css,/data-game-type="runner"\] \.nr-move\{display:none!important\}/,'endless mode leaves the left side for its jump action');
assert.match(css,/\.nr-touch-jump\{[\s\S]*width:clamp\(68px[\s\S]*\.nr-action-right \[data-act="dash"\][\s\S]*\.nr-action-right \[data-act="slide"\]/,'runner actions use the split two-thumb geometry');
assert.match(css,/data-game-type="challenge"\] \.nr-touch-jump\{grid-column:3[\s\S]*data-game-type="challenge"\] \.nr-action-right\{grid-column:4/,'challenge movement and actions occupy separate hands');
assert.doesNotMatch(game,/game\.over>0\)[^{]*\{[^}]*strokeRect\(4,4,W-8,H-8\)/,'the old rectangular overload border is gone');
assert.match(stateEffects,/const over=game\.over>0[\s\S]*if\(shield\)[\s\S]*if\(magnet\)[\s\S]*if\(slowed\)/,'player states share the local atmospheric renderer');
assert.match(game,/player\(\);drawStateAtmosphere\(\);hud\(\)/,'atmosphere stays behind the readable HUD');

console.log('custom selects, character previews, rounded-square controls, and PWA checks passed');
