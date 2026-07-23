import assert from 'node:assert/strict';

await import('../i18n.js');
const translations=globalThis.NovaRunI18n;
const required=['gameLabel','language','difficulty','scene','jump','slide','dash','paused','gameOver','landscape','portrait','systemOffline','dreamPeak','tideCity','sandClock','platformFeatures','tideFeatures','sandFeatures','platformControls','controlsHelp','closeSettingsResume','checkpointRespawn','levelComplete','settings','reduceMotion','jumpCue','slideCue','dashCue','newBest','runSummary','progress','dailyTasks','achievements','shareScore','clearSave','tutorialJumpTitle','tutorialDashTitle','shareTemplate','shareFallbackTitle','manualCopy','copyShare','skin_nova','theme','darkMode','lightMode','mapSelection','endlessMode','challengeMode','stageMode','startChallenge','preview_dreamPeak','preview_tideCity','preview_sandClock'];

assert.deepEqual(Object.keys(translations).sort(),['en','ru','zh']);
for(const language of Object.keys(translations)){
  for(const key of required)assert.ok(translations[language][key],`${language}.${key} is translated`);
}

console.log('translation checks passed');
