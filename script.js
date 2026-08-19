/* =========================================================
   ARENA DE SOMBRAS — Lógica Completa + Firebase
   ========================================================= */

import { monitorAuthState, loginWithGoogle, logout, loadPlayerData, savePlayerData } from './firebase-services.js';

// ---------- Motor de Som Procedural (Web Audio API) ----------
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();
let soundEnabled = true;

function playSfx(type) {
  if (!soundEnabled) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  
  if (type === 'hit') { osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(40, now + 0.1); gain.gain.setValueAtTime(0.3, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1); osc.start(now); osc.stop(now + 0.1); }
  else if (type === 'crit') { osc.type = 'square'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(80, now + 0.2); gain.gain.setValueAtTime(0.4, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2); }
  else if (type === 'heal') { osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.linearRampToValueAtTime(600, now + 0.2); gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.2, now + 0.1); gain.gain.linearRampToValueAtTime(0, now + 0.3); osc.start(now); osc.stop(now + 0.3); }
  else if (type === 'death') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(20, now + 0.6); gain.gain.setValueAtTime(0.4, now); gain.gain.linearRampToValueAtTime(0, now + 0.6); osc.start(now); osc.stop(now + 0.6); }
  else if (type === 'levelup') { osc.type = 'square'; osc.frequency.setValueAtTime(300, now); osc.frequency.setValueAtTime(400, now + 0.1); osc.frequency.setValueAtTime(500, now + 0.2); gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.4); osc.start(now); osc.stop(now + 0.4); }
}

// ---------- Referências do DOM ----------
const el = {
  // Autenticação & Layout
  loginOverlay: document.getElementById('login-overlay'),
  loadingOverlay: document.getElementById('loading-overlay'),
  btnLoginGoogle: document.getElementById('btn-login-google'),
  btnProfile: document.getElementById('btn-profile'),
  btnSound: document.getElementById('btn-sound'),
  btnLogout: document.getElementById('btn-logout'),
  userAuthInfo: document.getElementById('user-auth-info'),
  userAvatar: document.getElementById('user-avatar'),
  userFirstname: document.getElementById('user-firstname'),
  arenaMain: document.getElementById('arena-main'),
  arenaActions: document.getElementById('arena-actions'),
  arenaLog: document.getElementById('arena-log'),

  // Elementos do Perfil
  profileOverlay: document.getElementById('profile-overlay'),
  btnCloseProfile: document.getElementById('btn-close-profile'),
  profileAvatar: document.getElementById('profile-avatar'),
  profileName: document.getElementById('profile-name'),
  profileLevelBadge: document.getElementById('profile-level-badge'),
  profileAtk: document.getElementById('profile-atk'),
  profileDef: document.getElementById('profile-def'),
  profileCrit: document.getElementById('profile-crit'),
  profileEvasion: document.getElementById('profile-evasion'),
  
  // Stats do perfil
  statEnemies: document.getElementById('stat-enemies'),
  statBosses: document.getElementById('stat-bosses'),
  statDmgDealt: document.getElementById('stat-dmg-dealt'),
  statDmgTaken: document.getElementById('stat-dmg-taken'),
  statCrits: document.getElementById('stat-crits'),
  statDeaths: document.getElementById('stat-deaths'),

  wave: document.getElementById('wave-number'),
  waveRecord: document.getElementById('wave-record'),
  gold: document.getElementById('gold-amount'),

  playerFrame: document.querySelector('.player .combatant-frame'),
  playerPortrait: document.getElementById('player-portrait'),
  playerLevel: document.getElementById('player-level'),
  playerHpFill: document.getElementById('player-hp-fill'),
  playerHpCurrent: document.getElementById('player-hp-current'),
  playerHpMax: document.getElementById('player-hp-max'),
  playerXpFill: document.getElementById('player-xp-fill'),
  playerXpCurrent: document.getElementById('player-xp-current'),
  playerXpNext: document.getElementById('player-xp-next'),
  playerAtk: document.getElementById('player-atk'),
  playerDef: document.getElementById('player-def'),
  playerCrit: document.getElementById('player-crit'),
  playerEvasion: document.getElementById('player-evasion'),
  playerStatusTags: document.getElementById('player-status-tags'),
  equipWeapon: document.getElementById('equip-weapon'),
  equipArmor: document.getElementById('equip-armor'),
  equipRing: document.getElementById('equip-ring'),
  equipRelic: document.getElementById('equip-relic'),

  enemyFrame: document.querySelector('.enemy .combatant-frame'),
  enemyPortrait: document.getElementById('enemy-portrait'),
  enemyName: document.getElementById('enemy-name'),
  enemyBossBadge: document.getElementById('enemy-boss-badge'),
  enemyLevel: document.getElementById('enemy-level'),
  enemyHpFill: document.getElementById('enemy-hp-fill'),
  enemyHpCurrent: document.getElementById('enemy-hp-current'),
  enemyHpMax: document.getElementById('enemy-hp-max'),
  enemyAtk: document.getElementById('enemy-atk'),
  enemyDef: document.getElementById('enemy-def'),
  enemyAbilityName: document.getElementById('enemy-ability-name'),
  enemyStatusTags: document.getElementById('enemy-status-tags'),
  enemyPhaseLine: document.getElementById('enemy-phase-line'),
  enemyPhaseName: document.getElementById('enemy-phase-name'),

  btnAttack: document.getElementById('btn-attack'),
  btnDefend: document.getElementById('btn-defend'),
  btnSpecial: document.getElementById('btn-special'),
  specialSub: document.getElementById('special-sub'),
  btnPotion: document.getElementById('btn-potion'),
  potionSub: document.getElementById('potion-sub'),
  log: document.getElementById('combat-log'),

  mapOverlay: document.getElementById('map-overlay'),
  mapWaveLabel: document.getElementById('map-wave-label'),
  mapChoices: document.getElementById('map-choices'),
  shopOverlay: document.getElementById('shop-overlay'),
  shopGoldValue: document.getElementById('shop-gold-value'),
  shopItems: document.getElementById('shop-items'),
  btnShopContinue: document.getElementById('btn-shop-continue'),
  levelupOverlay: document.getElementById('levelup-overlay'),
  levelupLevel: document.getElementById('levelup-level'),
  levelupChoices: document.getElementById('levelup-choices'),
  overlay: document.getElementById('end-overlay'),
  endEyebrow: document.getElementById('end-eyebrow'),
  endTitle: document.getElementById('end-title'),
  endMessage: document.getElementById('end-message'),
  btnRestart: document.getElementById('btn-restart')
};

// ---------- Constantes Base ----------
const BESTIARY = [
  { id: 'goblin', name: 'Goblin Batedor', icon: '👹', hp: 60, atk: 9, def: 2, xp: 20, gold: 18, ability: 'Ataque Rápido', abilityDesc: '30% de chance de atacar 2x.' },
  { id: 'bandido', name: 'Bandido das Sombras', icon: '🗡️', hp: 75, atk: 11, def: 4, xp: 26, gold: 24, ability: 'Golpe Sujo', abilityDesc: 'Chance de ignorar defesa.' },
  { id: 'lobo', name: 'Lobo Sanguinário', icon: '🐺', hp: 68, atk: 13, def: 3, xp: 30, gold: 22, ability: 'Mordida', abilityDesc: 'Chance de Sangramento.' },
  { id: 'esqueleto', name: 'Esqueleto Arruinado', icon: '💀', hp: 90, atk: 12, def: 6, xp: 34, gold: 28, ability: 'Ossos Amaldiçoados', abilityDesc: 'Reduz seu ataque.' },
  { id: 'ogro', name: 'Ogro da Fenda', icon: '👺', hp: 130, atk: 16, def: 7, xp: 45, gold: 36, ability: 'Esmagamento', abilityDesc: 'Golpe pesado (3 turnos).', abilityMaxCooldown: 3 },
];

const BOSSES = [
  { id: 'boss1', name: 'Cavaleiro Carmesim', icon: '🩸', hp: 260, atk: 20, def: 9, xp: 120, gold: 140, ability: 'Frenesi Carmesim', abilityDesc: 'Fica forte ao perder PV.' },
  { id: 'boss2', name: 'Lorde do Vazio', icon: '👑', hp: 420, atk: 27, def: 13, xp: 260, gold: 300, ability: 'Sacrifício Final', abilityDesc: 'Golpe devastador.', isFinal: true },
];

const LEVELUP_POOL = [
  { key: 'forca', title: 'Força', desc: '+3 de Ataque', apply: (p) => { p.baseAtk += 3; } },
  { key: 'resistencia', title: 'Resistência', desc: '+15 PV máximo', apply: (p) => { p.maxHp += 15; p.hp = Math.min(p.maxHp, p.hp + 15); } },
  { key: 'precisao', title: 'Precisão', desc: '+5% Crítico', apply: (p) => { p.baseCrit += 5; } },
  { key: 'instinto', title: 'Instinto', desc: '+4% Esquiva', apply: (p) => { p.baseEvasion += 4; } },
];

const EQUIP_POOLS = {
  weapon: [{ name: 'Espada Enferrujada', atk: 3 }, { name: 'Lâmina Carmesim', atk: 6 }, { name: 'Machado Brutal', atk: 9 }],
  armor: [{ name: 'Couro do Caçador', def: 4 }, { name: 'Cota de Malha', def: 7 }, { name: 'Placa Sombria', def: 11 }],
  ring: [{ name: 'Anel da Sombra', crit: 5 }, { name: 'Anel do Predador', crit: 9 }],
  relic: [{ name: 'Olho Carmesim', evasion: 5 }, { name: 'Coração Negro', evasion: 8 }]
};

const SHOP_ITEMS = [
  { id: 'pocao', name: 'Poção de Vida', desc: 'Adiciona 1 poção.', price: 50, effect: () => { state.player.potions += 1; } },
  { id: 'pedraforca', name: 'Pedra de Força', desc: '+2 Ataque permanente.', price: 150, effect: () => { state.player.baseAtk += 2; } },
  { id: 'fragmentosombrio', name: 'Fragmento Sombrio', desc: '+4% Crítico permanente.', price: 500, effect: () => { state.player.baseCrit += 4; } },
];

const NODE_INFO = {
  batalha: { icon: '⚔️', title: 'Batalha', desc: 'Combate direto.' },
  tesouro: { icon: '💰', title: 'Tesouro', desc: 'Receba Fragmentos/itens.' },
  ritual: { icon: '🩸', title: 'Ritual', desc: 'Perca PV, ganhe melhoria.' },
  santuario: { icon: '🧪', title: 'Santuário', desc: 'Recupere 40% do PV.' },
  loja: { icon: '🛒', title: 'Mercador', desc: 'Compre poções/melhorias.' },
};

// ---------- Estado e Sincronização Firebase ----------
let state = null;
let currentUser = null;
let saveTimeout = null;

function novoEstado(uid, user){
  return {
    uid: uid,
    profile: {
      displayName: user.displayName || "Jogador",
      photoURL: user.photoURL || "",
      email: user.email,
      lastLogin: new Date().toISOString()
    },
    wave: 1, bestWave: 1, gold: 0, turnLocked: false, specialCooldown: 0, specialMaxCooldown: 3, pendingMapWave: null,
    player: {
      level: 1, xp: 0, xpToNext: 60, hp: 100, maxHp: 100, baseAtk: 14, baseDef: 5, baseCrit: 8, baseEvasion: 6,
      tempAtkMod: 0, potions: 0, equipment: { weapon: null, armor: null, ring: null, relic: null }, defending: false, statusEffects: {}
    },
    stats: { enemiesDefeated: 0, bossesDefeated: 0, damageDealt: 0, damageTaken: 0, criticalHits: 0, deaths: 0, totalRuns: 1 },
    enemy: null
  };
}

// Sistema de Auto-Save Debounced (Evita spam de requisições)
function agendarSave() {
  if (!currentUser || !state) return;
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    state.profile.lastLogin = new Date().toISOString();
    const success = await savePlayerData(currentUser.uid, state);
    if (!success) mostrarToast("⚠ Sem conexão. Progresso mantido localmente.");
  }, 2000); // Salva após 2s sem alterações
}

function salvarImediato() {
  if (saveTimeout) clearTimeout(saveTimeout);
  if (currentUser && state) {
    savePlayerData(currentUser.uid, state).catch(() => mostrarToast("⚠ Erro ao salvar na nuvem."));
  }
}

function mostrarToast(msg) {
  const t = document.getElementById('toast-notification');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ---------- Estatísticas Base ----------
function statAtk(p){ return p.baseAtk + (p.equipment.weapon ? p.equipment.weapon.atk : 0) + p.tempAtkMod; }
function statDef(p){ return p.baseDef + (p.equipment.armor ? p.equipment.armor.def : 0); }
function statCrit(p){ return p.baseCrit + (p.equipment.ring ? p.equipment.ring.crit : 0); }
function statEvasion(p){ return p.baseEvasion + (p.equipment.relic ? p.equipment.relic.evasion : 0); }

function atualizarRecorde(w){
  if (w > state.bestWave) { state.bestWave = w; }
}

function gerarInimigo(wave){
  let def, isBoss = false;
  if (wave % 10 === 0){ def = BOSSES[1]; isBoss = true; }
  else if (wave % 5 === 0){ def = BOSSES[0]; isBoss = true; }
  else { def = BESTIARY[(wave - 1) % BESTIARY.length]; }

  const escala = 1 + (wave - 1) * (isBoss ? 0.10 : 0.16);
  return {
    id: def.id, name: def.name, icon: def.icon, level: wave, hp: Math.round(def.hp * escala), maxHp: Math.round(def.hp * escala),
    atk: Math.round(def.atk * escala), def: Math.round(def.def * escala),
    xpReward: Math.round(def.xp * (1 + (wave - 1) * 0.1)), goldReward: Math.round(def.gold * (1 + (wave - 1) * 0.1)),
    ability: def.ability, abilityDesc: def.abilityDesc, abilityCooldown: 0, abilityMaxCooldown: def.abilityMaxCooldown || 0,
    statusEffects: {}, isBoss, isFinal: !!def.isFinal,
  };
}

// ---------- UI e Combate ----------
function rand(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }
function logMsg(text, cls){ const p = document.createElement('p'); p.textContent = text; if (cls) p.className = cls; el.log.prepend(p); }
function floatingNumber(target, text, cls){ const span = document.createElement('span'); span.className = 'floating-dmg' + (cls ? ' ' + cls : ''); span.textContent = text; target.appendChild(span); setTimeout(() => span.remove(), 900); }
function triggerAnim(frame, animClass) { frame.classList.remove(animClass); void frame.offsetWidth; frame.classList.add(animClass); setTimeout(() => frame.classList.remove(animClass), 300); }
function shake(frame){ triggerAnim(frame, 'hit'); }
function lunge(frame, direction) { triggerAnim(frame, direction === 'right' ? 'attacking-right' : 'attacking-left'); }

function render(){
  if(!state) return;
  el.wave.textContent = String(state.wave).padStart(2, '0');
  el.waveRecord.textContent = String(state.bestWave).padStart(2, '0');
  el.gold.textContent = state.gold + ' 🪙';

  el.playerLevel.textContent = state.player.level;
  
  // CORREÇÃO: Removemos a tentativa de atualizar Atk/Def/Crit aqui,
  // pois eles agora vivem apenas no menu de Perfil.
  
  el.playerHpMax.textContent = state.player.maxHp;
  atualizarBarra(el.playerHpFill, el.playerHpCurrent, state.player.hp, state.player.maxHp);
  el.playerXpNext.textContent = state.player.xpToNext; el.playerXpCurrent.textContent = state.player.xp;
  el.playerXpFill.style.width = Math.min(100, (state.player.xp / state.player.xpToNext) * 100) + '%';
  renderStatusTags(el.playerStatusTags, state.player);

  const eq = state.player.equipment;
  el.equipWeapon.textContent = eq.weapon ? eq.weapon.name : '—'; el.equipArmor.textContent = eq.armor ? eq.armor.name : '—';
  el.equipRing.textContent = eq.ring ? eq.ring.name : '—'; el.equipRelic.textContent = eq.relic ? eq.relic.name : '—';

  if(state.enemy) {
    el.enemyName.textContent = state.enemy.name; el.enemyPortrait.textContent = state.enemy.icon;
    el.enemyLevel.textContent = state.enemy.level; el.enemyHpMax.textContent = state.enemy.maxHp;
    el.enemyBossBadge.classList.toggle('show', state.enemy.isBoss);
    atualizarBarra(el.enemyHpFill, el.enemyHpCurrent, state.enemy.hp, state.enemy.maxHp);
    renderStatusTags(el.enemyStatusTags, state.enemy);
    el.enemyAbilityName.textContent = `${state.enemy.ability} — ${state.enemy.abilityDesc}`;
    
    if (state.enemy.isBoss && state.enemy.hp > 0) {
      el.enemyPhaseLine.style.display = 'block';
      let hpPct = state.enemy.hp / state.enemy.maxHp;
      el.enemyFrame.classList.remove('wounded', 'enraged');
      if (hpPct <= 0.3) { el.enemyFrame.classList.add('enraged'); el.enemyPhaseName.textContent = 'Fúria Final'; } 
      else if (hpPct <= 0.7) { el.enemyFrame.classList.add('wounded'); el.enemyPhaseName.textContent = 'Ferido'; } 
      else { el.enemyPhaseName.textContent = 'Normal'; }
    } else {
      el.enemyPhaseLine.style.display = 'none'; el.enemyFrame.classList.remove('wounded', 'enraged');
    }
  }

  el.playerFrame.classList.toggle('defending', state.player.defending);
  el.btnSpecial.disabled = state.turnLocked || state.specialCooldown > 0;
  el.specialSub.textContent = state.specialCooldown > 0 ? `recarregando (${state.specialCooldown})` : '150% dano + sangramento';
  el.btnAttack.disabled = state.turnLocked; el.btnDefend.disabled = state.turnLocked;
  el.btnPotion.disabled = state.turnLocked || state.player.potions <= 0; el.potionSub.textContent = `${state.player.potions} disponíveis`;
}

function atualizarBarra(fill, text, hp, max){ const pct = Math.max(0, Math.min(100, (hp / max) * 100)); fill.style.width = pct + '%'; fill.classList.toggle('low', pct <= 25 && pct > 0); text.textContent = Math.max(0, hp); }
function renderStatusTags(container, unit){
  container.innerHTML = '';
  if (unit.statusEffects.bleed){ const tag = document.createElement('span'); tag.className = 'status-tag bleed'; tag.textContent = `🩸 Sang (${unit.statusEffects.bleed.turns})`; container.appendChild(tag); }
  if (unit.statusEffects.atkDown){ const tag = document.createElement('span'); tag.className = 'status-tag debuff'; tag.textContent = `⚔️ Atk -${Math.abs(unit.statusEffects.atkDown.amount)} (${unit.statusEffects.atkDown.turnsLeft})`; container.appendChild(tag); }
}

function calcularDano(atk, def, { ignoreDef = false, critChance = 0, mult = 1 } = {}){
  const defEff = ignoreDef ? 0 : def;
  let bruto = Math.max(1, Math.round((rand(atk - 2, atk + 2) - Math.round(defEff / 2)) * mult));
  const isCrit = critChance > 0 && Math.random() * 100 < critChance;
  if (isCrit) { bruto = Math.round(bruto * 1.5); state.stats.criticalHits++; }
  return { dano: bruto, isCrit };
}

function aplicarDanoNoInimigo(dano, isCrit){
  state.enemy.hp -= dano; state.stats.damageDealt += dano;
  shake(el.enemyFrame); floatingNumber(el.enemyPortrait, '-' + dano, isCrit ? 'crit' : null); playSfx(isCrit ? 'crit' : 'hit');
}

function aplicarDanoJogador(dano, { evasavel = true } = {}){
  if (evasavel && Math.random() * 100 < statEvasion(state.player)){ logMsg(`Esquiva perfeita.`, 'system'); floatingNumber(el.playerPortrait, 'desviado', 'block'); return; }
  let finalDmg = state.player.defending ? Math.max(1, Math.round(dano * 0.5)) : dano;
  if (state.player.defending) floatingNumber(el.playerPortrait, 'bloqueado', 'block');
  state.player.hp -= finalDmg; state.stats.damageTaken += finalDmg;
  shake(el.playerFrame); floatingNumber(el.playerPortrait, '-' + finalDmg, null); playSfx('hit');
  logMsg(`${state.enemy.name} causa ${finalDmg} dano.`, 'hit-player');
}

function playerAttack(){
  lunge(el.playerFrame, 'right');
  const { dano, isCrit } = calcularDano(statAtk(state.player), state.enemy.def, { critChance: statCrit(state.player) });
  setTimeout(() => aplicarDanoNoInimigo(dano, isCrit), 150);
  logMsg(`Ataque causa ${dano} de dano.${isCrit ? ' CRÍTICO!' : ''}`, isCrit ? 'crit' : 'hit-enemy');
  agendarSave();
}

function playerSpecial(){
  lunge(el.playerFrame, 'right');
  const { dano, isCrit } = calcularDano(statAtk(state.player), state.enemy.def, { critChance: statCrit(state.player), mult: 1.5 });
  setTimeout(() => {
    aplicarDanoNoInimigo(dano, isCrit);
    state.enemy.statusEffects.bleed = { turns: 3, dmg: Math.max(2, Math.round(statAtk(state.player) * 0.22)) };
    logMsg(`Corte Profundo causa ${dano} dano${isCrit ? ' CRÍTICO!' : ''} e Sangramento.`, 'crit');
  }, 150);
  agendarSave();
}

function turnoInimigo(){
  if (state.enemy.hp <= 0) return;
  lunge(el.enemyFrame, 'left');
  setTimeout(() => {
    const pDef = statDef(state.player); let usedAb = false;
    switch (state.enemy.id){
      case 'goblin': aplicarDanoJogador(calcularDano(state.enemy.atk, pDef).dano); if (Math.random() < 0.3) { usedAb = true; aplicarDanoJogador(calcularDano(state.enemy.atk, pDef).dano); } break;
      case 'bandido': const ign = Math.random() < 0.35; usedAb = ign; aplicarDanoJogador(calcularDano(state.enemy.atk, pDef, { ignoreDef: ign }).dano); break;
      case 'lobo': aplicarDanoJogador(calcularDano(state.enemy.atk, pDef).dano); if (state.player.hp > 0 && Math.random() < 0.4) { usedAb = true; state.player.statusEffects.bleed = { turns: 3, dmg: Math.max(2, Math.round(state.enemy.atk * 0.18)) }; } break;
      case 'ogro': if (state.enemy.abilityCooldown <= 0){ usedAb = true; aplicarDanoJogador(calcularDano(state.enemy.atk, pDef, { mult: 1.8 }).dano); state.enemy.abilityCooldown = state.enemy.abilityMaxCooldown; } else { aplicarDanoJogador(calcularDano(state.enemy.atk, pDef).dano); } break;
      case 'boss1': case 'boss2': const hpPct = (state.enemy.hp / state.enemy.maxHp); let m = hpPct <= 0.3 ? 1.6 : (hpPct <= 0.7 ? 1.25 : 1); if(hpPct <= 0.3) usedAb = true; aplicarDanoJogador(calcularDano(state.enemy.atk, pDef, { mult: m }).dano); break;
      default: aplicarDanoJogador(calcularDano(state.enemy.atk, pDef).dano);
    }
    if (usedAb) logMsg(`${state.enemy.name} usa ${state.enemy.ability}!`, 'system');
  }, 150);
}

function finalizarTurno(){
  render();
  if (state.enemy.hp <= 0) { venceuOnda(); return; }
  state.turnLocked = true; render();

  setTimeout(() => {
    if (state.enemy.statusEffects.bleed) { state.enemy.hp -= state.enemy.statusEffects.bleed.dmg; state.enemy.statusEffects.bleed.turns -= 1; if(state.enemy.statusEffects.bleed.turns <= 0) delete state.enemy.statusEffects.bleed; shake(el.enemyFrame); floatingNumber(el.enemyPortrait, '-' + state.enemy.statusEffects.bleed.dmg, 'bleed'); }
    render();
    if (state.enemy.hp <= 0){ setTimeout(venceuOnda, 400); return; }

    setTimeout(() => {
      turnoInimigo();
      setTimeout(() => {
        if(state.player.statusEffects.bleed){ state.player.hp -= state.player.statusEffects.bleed.dmg; state.player.statusEffects.bleed.turns -= 1; if(state.player.statusEffects.bleed.turns<=0) delete state.player.statusEffects.bleed; shake(el.playerFrame); floatingNumber(el.playerPortrait, '-' + state.player.statusEffects.bleed.dmg, 'bleed'); }
        if(state.player.statusEffects.atkDown){ state.player.statusEffects.atkDown.turnsLeft -=1; if(state.player.statusEffects.atkDown.turnsLeft<=0){ state.player.tempAtkMod += state.player.statusEffects.atkDown.amount; delete state.player.statusEffects.atkDown; } }
        state.player.defending = false;
        if (state.enemy.abilityCooldown > 0) state.enemy.abilityCooldown -= 1;
        if (state.specialCooldown > 0) state.specialCooldown -= 1;
        state.turnLocked = false; render();
        if (state.player.hp <= 0) matarEntidade(el.playerFrame, false);
      }, 300);
    }, 500);
  }, 400);
}

function matarEntidade(frameTarget, isEnemyVictory) {
  state.turnLocked = true; playSfx('death'); frameTarget.classList.add('defeated');
  setTimeout(() => { if (isEnemyVictory) handleEnemyDefeat(); else fimDeJogo(false); }, 700);
}

function venceuOnda() { matarEntidade(el.enemyFrame, true); }

function handleEnemyDefeat(){
  el.enemyFrame.classList.remove('defeated');
  state.stats.enemiesDefeated++;
  if(state.enemy.isBoss) state.stats.bossesDefeated++;
  const xpG = state.enemy.xpReward, ouroG = state.enemy.goldReward, final = state.enemy.isFinal;
  logMsg(`${state.enemy.name} caiu! (+${xpG} XP, +${ouroG} 🪙)`, 'system');
  state.gold += ouroG; atualizarRecorde(state.wave);
  salvarImediato(); // Força save no fim da batalha

  ganharXP(xpG, () => {
    if (final) fimDeJogo(true); else abrirMapa(state.wave + 1);
  });
}

function ganharXP(qtd, callback){
  state.player.xp += qtd; const filaLvl = [];
  while (state.player.xp >= state.player.xpToNext){
    state.player.xp -= state.player.xpToNext; state.player.level += 1;
    state.player.xpToNext = 60 + (state.player.level - 1) * 40;
    filaLvl.push(state.player.level);
  }
  processarFilaLevelUp(filaLvl, callback);
}

function processarFilaLevelUp(fila, callback){
  if (fila.length === 0){ render(); callback(); return; }
  const nivel = fila.shift(); playSfx('levelup'); logMsg(`Nível ${nivel} alcançado!`, 'system');
  el.levelupLevel.textContent = nivel; el.levelupChoices.innerHTML = '';
  const opcoes = [...LEVELUP_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
  opcoes.forEach((op) => {
    const btn = document.createElement('button'); btn.className = 'levelup-choice';
    btn.innerHTML = `<span class="choice-title">${op.title}</span><span class="choice-desc">${op.desc}</span>`;
    btn.onclick = () => { op.apply(state.player); logMsg(`Ganhou ${op.title}.`, 'system'); el.levelupOverlay.classList.remove('show'); salvarImediato(); processarFilaLevelUp(fila, callback); };
    el.levelupChoices.appendChild(btn);
  });
  el.levelupOverlay.classList.add('show');
}

// ---------- Mapa ----------
function iniciarBatalha(waveAlvo){
  state.wave = waveAlvo; state.enemy = gerarInimigo(waveAlvo); state.turnLocked = false; atualizarRecorde(waveAlvo); el.enemyFrame.classList.remove('defeated');
  logMsg(`Onda ${waveAlvo}${state.enemy.isBoss ? ' — CHEFE' : ''}: ${state.enemy.name} surge.`, 'system');
  salvarImediato(); render();
}

function abrirMapa(waveAlvo){
  if (waveAlvo % 5 === 0) { logMsg(`CHEFE aproxima-se!`, 'system'); iniciarBatalha(waveAlvo); return; }
  const extras = ['tesouro', 'ritual', 'santuario', 'loja'].sort(() => Math.random() - 0.5).slice(0, 2);
  const opcoes = ['batalha', ...extras].sort(() => Math.random() - 0.5);
  el.mapWaveLabel.textContent = waveAlvo; el.mapChoices.innerHTML = '';
  opcoes.forEach((tipo) => {
    const info = NODE_INFO[tipo];
    const btn = document.createElement('button'); btn.className = 'map-choice';
    btn.innerHTML = `<span class="choice-icon">${info.icon}</span><span class="choice-text"><span class="choice-title">${info.title}</span><span class="choice-desc">${info.desc}</span></span>`;
    btn.onclick = () => { el.mapOverlay.classList.remove('show'); resolverNode(tipo, waveAlvo); };
    el.mapChoices.appendChild(btn);
  });
  el.mapOverlay.classList.add('show');
}

function resolverNode(tipo, waveAlvo){
  if (tipo === 'batalha'){ iniciarBatalha(waveAlvo); return; }
  if (tipo === 'loja'){ abrirLoja(waveAlvo); return; }
  state.wave = waveAlvo; atualizarRecorde(waveAlvo);
  if (tipo === 'tesouro'){
    const ouro = rand(30, 50) + waveAlvo * 4; state.gold += ouro; logMsg(`Tesouro: +${ouro} 🪙.`, 'system');
    if (Math.random() < 0.45){
      const s = Object.keys(EQUIP_POOLS)[rand(0, 3)]; const p = EQUIP_POOLS[s];
      const item = p[rand(0, Math.min(p.length - 1, Math.floor(waveAlvo / 4)))];
      state.player.equipment[s] = item; logMsg(`Equipou: ${item.name}.`, 'system');
    }
  } else if (tipo === 'ritual'){
    const p = Math.max(1, Math.round(state.player.maxHp * 0.1)); state.player.hp = Math.max(1, state.player.hp - p);
    const b = LEVELUP_POOL[rand(0, LEVELUP_POOL.length - 1)]; b.apply(state.player); logMsg(`Ritual: -${p} PV, ganho de ${b.title}.`, 'system');
  } else if (tipo === 'santuario'){
    const c = Math.round(state.player.maxHp * 0.4); state.player.hp = Math.min(state.player.maxHp, state.player.hp + c); playSfx('heal'); logMsg(`Santuário cura ${c} PV.`, 'heal');
  }
  salvarImediato(); render(); setTimeout(() => abrirMapa(waveAlvo + 1), 700);
}

function abrirLoja(w){
  state.pendingMapWave = w; el.shopGoldValue.textContent = state.gold; el.shopItems.innerHTML = '';
  SHOP_ITEMS.forEach((item) => {
    const row = document.createElement('div'); row.className = 'shop-item';
    row.innerHTML = `<div class="shop-item-info"><span class="shop-item-title">${item.name}</span><span class="shop-item-desc">${item.desc}</span></div><button class="shop-buy-btn" ${state.gold < item.price ? 'disabled' : ''}>${item.price} 🪙</button>`;
    row.querySelector('.shop-buy-btn').onclick = () => {
      if(state.gold < item.price) return;
      state.gold -= item.price; item.effect(); logMsg(`Comprou: ${item.name}.`, 'system');
      salvarImediato(); abrirLoja(w); render();
    };
    el.shopItems.appendChild(row);
  });
  el.shopOverlay.classList.add('show');
}
el.btnShopContinue.onclick = () => { el.shopOverlay.classList.remove('show'); abrirMapa(state.pendingMapWave + 1); };

function fimDeJogo(venceu){
  state.turnLocked = true; atualizarRecorde(state.wave); state.stats.deaths++; salvarImediato(); render();
  el.overlay.classList.add('show');
  if (venceu){ el.endEyebrow.textContent = 'Campanha Concluída'; el.endTitle.textContent = 'Vitória'; el.endMessage.textContent = 'Você dominou a Arena.'; } 
  else { el.endEyebrow.textContent = 'Fim de Combate'; el.endTitle.textContent = 'Derrota'; el.endMessage.textContent = `Você caiu na onda ${state.wave}.`; }
}

// Botoes de Combate
el.btnAttack.onclick = () => { if (!state.turnLocked) { playerAttack(); finalizarTurno(); } };
el.btnDefend.onclick = () => { if (!state.turnLocked) { state.player.defending = true; logMsg('Você levanta guarda.', 'system'); finalizarTurno(); } };
el.btnSpecial.onclick = () => { if (!state.turnLocked && state.specialCooldown <= 0) { playerSpecial(); state.specialCooldown = state.specialMaxCooldown; finalizarTurno(); } };
el.btnPotion.onclick = () => { if (!state.turnLocked && state.player.potions > 0) { state.player.potions -= 1; const c = 30; state.player.hp = Math.min(state.player.maxHp, state.player.hp + c); playSfx('heal'); floatingNumber(el.playerPortrait, '+' + c, 'heal'); logMsg('Bebeu uma poção.', 'heal'); agendarSave(); finalizarTurno(); } };

el.btnRestart.onclick = () => {
  el.overlay.classList.remove('show');
  // Zera progresso atual mas mantém recordes e status vitais
  const best = state.bestWave; const stats = state.stats;
  state = novoEstado(currentUser.uid, currentUser);
  state.bestWave = best; state.stats = stats; state.stats.totalRuns++;
  salvarImediato();
  el.log.innerHTML = ''; logMsg('A arena aguarda. As tochas vermelhas se acendem.', 'system');
  iniciarBatalha(1);
};

// Autenticação & Perfil
el.btnLoginGoogle.onclick = async () => {
  try {
    el.btnLoginGoogle.disabled = true;
    el.btnLoginGoogle.querySelector('.btn-title').textContent = "Carregando...";
    await loginWithGoogle();
  } catch (err) {
    el.btnLoginGoogle.disabled = false;
    el.btnLoginGoogle.querySelector('.btn-title').textContent = "🌐 Entrar com Google";
    mostrarToast("Erro ao fazer login.");
  }
};

el.btnLogout.onclick = async () => {
  if(confirm("Deseja mesmo sair da sua conta? O jogo voltará para a tela inicial.")) {
    await logout();
  }
};

el.btnProfile.onclick = () => {
  if(!state) return;
  el.profileName.textContent = currentUser.displayName || "Jogador";
  el.profileAvatar.src = currentUser.photoURL || "";
  el.profileLevelBadge.textContent = state.player.level;
  el.profileAtk.textContent = statAtk(state.player); el.profileDef.textContent = statDef(state.player);
  el.profileCrit.textContent = statCrit(state.player) + '%'; el.profileEvasion.textContent = statEvasion(state.player) + '%';
  el.statEnemies.textContent = state.stats.enemiesDefeated; el.statBosses.textContent = state.stats.bossesDefeated;
  el.statDmgDealt.textContent = state.stats.damageDealt; el.statDmgTaken.textContent = state.stats.damageTaken;
  el.statCrits.textContent = state.stats.criticalHits; el.statDeaths.textContent = state.stats.deaths;
  el.profileOverlay.classList.add('show');
};
el.btnCloseProfile.onclick = () => { el.profileOverlay.classList.remove('show'); };
el.btnSound.onclick = () => { soundEnabled = !soundEnabled; el.btnSound.classList.toggle('muted', !soundEnabled); el.btnSound.title = soundEnabled ? "Alternar Som/Música" : "Som Desativado"; };

// ---------- Inicialização Geral (Auth Flow) ----------
monitorAuthState(async (user) => {
  if (user) {
    currentUser = user;
    el.loginOverlay.classList.remove('show');
    el.loadingOverlay.classList.add('show');
    
    // Configura UI do usuário logado
    el.userAuthInfo.style.display = 'flex';
    el.userAvatar.src = user.photoURL || '';
    el.userFirstname.textContent = (user.displayName || "Jogador").split(" ")[0];

    try {
      const data = await loadPlayerData(user.uid);
      if (data) {
        state = data;
        logMsg('Jornada recuperada das sombras (Nuvem).', 'system');
      } else {
        state = novoEstado(user.uid, user);
        await savePlayerData(user.uid, state);
        logMsg('Uma nova alma adentra a arena.', 'system');
      }
      
      // Exibe UI de Combate
      el.arenaMain.style.display = 'grid';
      el.arenaActions.style.display = 'grid';
      el.arenaLog.style.display = 'block';
      el.loadingOverlay.classList.remove('show');

      // Restaura o combate de onde parou ou inicia do mapa/onda 1
      if(state.enemy && state.enemy.hp > 0) {
        render();
        logMsg(`Batalha contra ${state.enemy.name} retomada.`, 'system');
      } else if (state.wave === 1 && (!state.enemy || state.enemy.hp <= 0)) {
        iniciarBatalha(1);
      } else {
        render();
        abrirMapa(state.wave);
      }
    } catch (e) {
      console.error(e);
      el.loadingOverlay.classList.remove('show');
      mostrarToast("Erro ao carregar dados do servidor.");
    }
  } else {
    // Usuário não logado - Reseta o jogo para a tela inicial
    currentUser = null;
    state = null;
    el.userAuthInfo.style.display = 'none';
    el.arenaMain.style.display = 'none';
    el.arenaActions.style.display = 'none';
    el.arenaLog.style.display = 'none';
    el.log.innerHTML = '';
    
    // Restaura botao de login
    el.btnLoginGoogle.disabled = false;
    el.btnLoginGoogle.querySelector('.btn-title').textContent = "🌐 Entrar com Google";
    
    el.loginOverlay.classList.add('show');
  }
});