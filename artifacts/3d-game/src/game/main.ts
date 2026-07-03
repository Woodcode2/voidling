import { CONFIG } from './config';
import { audio } from './audio';
import { FXManager } from './fx';
import { WorldManager } from './world';
import { Player } from './player';
import { meta } from './meta';
import { track, AdService, IAPService } from './services';
import { formatTime } from './utils';
import { UIHelper } from './ui';

enum GameState {
  HOME, DAILY_INTRO, GAME, BOON_PICK, RESULTS, SHOP
}

export function initGame(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  let rafId = 0;
  let lastTime = 0;
  let accum = 0;

  // State
  let state = GameState.HOME;
  let fw = 0, fh = 0;
  
  const fx = new FXManager();
  let world = new WorldManager(CONFIG.MAP_SIZE);
  let player: Player | null = null;

  let pointerX = 0;
  let pointerY = 0;
  let isDragging = false;
  let clickEvent: {x: number, y: number} | null = null;

  let timeLeft = 0;
  let nextBoonTime = 0;
  let boonCards: any[] = [];
  let isDaily = false;
  let homeTime = 0; // accumulates ms for home-screen idle animation

  meta.load();
  audio.init();
  meta.checkDailyStreak();

  const resize = () => {
    fw = window.innerWidth;
    fh = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = fw * dpr;
    canvas.height = fh * dpr;
    // Reset transform then apply DPR scale atomically — prevents cumulative scaling on repeated resizes
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  window.addEventListener('resize', resize);
  resize();

  // Track touch start position to detect tap vs drag
  let touchStartX = 0, touchStartY = 0;

  const getCoords = (e: PointerEvent | TouchEvent): {x: number, y: number} => {
    const rect = canvas.getBoundingClientRect();
    if (e.type.startsWith('touch')) {
      const te = e as TouchEvent;
      // changedTouches works on touchend; touches[0] on touchstart/move
      const t = te.changedTouches[0] || te.touches[0];
      if (!t) return { x: 0, y: 0 };
      return { x: t.clientX - rect.left, y: t.clientY - rect.top };
    }
    const pe = e as PointerEvent;
    return { x: pe.clientX - rect.left, y: pe.clientY - rect.top };
  };

  const handlePointer = (e: PointerEvent | TouchEvent) => {
    e.preventDefault();
    const { x: cx, y: cy } = getCoords(e);

    if (e.type === 'pointerdown' || e.type === 'touchstart') {
      isDragging = true;
      pointerX = cx;
      pointerY = cy;
      touchStartX = cx;
      touchStartY = cy;

      // Resume audio context on first touch
      if (audio.ctx && audio.ctx.state === 'suspended') {
        audio.ctx.resume();
      }
    } else if (e.type === 'pointermove' || e.type === 'touchmove') {
      if (isDragging) {
        pointerX = cx;
        pointerY = cy;
      }
    } else if (e.type === 'pointerup' || e.type === 'touchend') {
      isDragging = false;
      // Only register as a click if the finger barely moved (tap, not drag)
      const dx = cx - touchStartX;
      const dy = cy - touchStartY;
      if (Math.hypot(dx, dy) < 20) {
        // Use start position for UI since end coords can be 0,0 on some iOS versions
        const tapX = cx !== 0 ? cx : touchStartX;
        const tapY = cy !== 0 ? cy : touchStartY;
        clickEvent = { x: tapX, y: tapY };
        console.log('[VOIDLING] tap registered', tapX, tapY, 'state=', state);
      }
    }
  };

  const cancelDrag = () => { isDragging = false; };

  canvas.addEventListener('pointerdown', handlePointer);
  canvas.addEventListener('pointermove', handlePointer);
  canvas.addEventListener('pointerup', handlePointer);
  canvas.addEventListener('pointercancel', cancelDrag);
  canvas.addEventListener('touchstart', handlePointer, {passive: false});
  canvas.addEventListener('touchmove', handlePointer, {passive: false});
  canvas.addEventListener('touchend', handlePointer, {passive: false});
  canvas.addEventListener('touchcancel', cancelDrag);

  const startGame = (daily: boolean) => {
    try {
      console.log('[VOIDLING] startGame called, daily=', daily);
      isDaily = daily;
      const seed = daily ? new Date().toDateString() : Date.now().toString();
      world = new WorldManager(CONFIG.MAP_SIZE);
      world.init(seed);
      console.log('[VOIDLING] world objects:', world.objects.length);
      
      player = new Player(CONFIG.MAP_SIZE/2, CONFIG.MAP_SIZE/2, fx);
      timeLeft = CONFIG.GAME_DURATION * 1000;
      nextBoonTime = 60 * 1000; // first boon at 60s left
      
      state = GameState.GAME;
      console.log('[VOIDLING] state set to GAME');
      track('round_start', { daily });
    } catch (err) {
      console.error('[VOIDLING] startGame error:', err);
    }
  };

  const drawHome = (dt: number) => {
    homeTime += dt;
    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, fw, fh);
    
    ctx.fillStyle = CONFIG.COLORS.uiText;
    ctx.font = 'bold 48px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VOIDLING', fw/2, fh * 0.12);

    // ── Animated idle Voidling ──────────────────────────────────────────────
    const cx = fw / 2;
    const cy = fh * 0.32 + Math.sin(homeTime / 700) * 6; // gentle bob
    const r  = Math.min(fw, fh) * 0.13 + Math.sin(homeTime / 900) * 2; // breathing pulse

    // Glow
    ctx.save();
    ctx.shadowColor = '#8C7CFF';
    ctx.shadowBlur  = 28;
    ctx.fillStyle   = '#8C7CFF';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Body
    ctx.fillStyle = '#2B2140';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Eyes — look in a slow circular pattern
    const lookAngle = homeTime / 1800;
    const eyeOffX = Math.cos(lookAngle) * r * 0.22;
    const eyeOffY = Math.sin(lookAngle) * r * 0.12;
    const eyeR    = r * 0.16;
    const eyeSep  = r * 0.32;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - eyeSep + eyeOffX, cy - r * 0.1 + eyeOffY, eyeR, 0, Math.PI * 2);
    ctx.arc(cx + eyeSep + eyeOffX, cy - r * 0.1 + eyeOffY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Occasional blink (every ~3 s, squish vertically for 120 ms)
    const blinkPhase = (homeTime % 3200);
    if (blinkPhase < 120) {
      const blinkScale = 1 - Math.sin((blinkPhase / 120) * Math.PI) * 0.9;
      ctx.fillStyle = '#2B2140';
      ctx.save();
      ctx.translate(cx - eyeSep + eyeOffX, cy - r * 0.1 + eyeOffY);
      ctx.scale(1, blinkScale);
      ctx.beginPath();
      ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(cx + eyeSep + eyeOffX, cy - r * 0.1 + eyeOffY);
      ctx.scale(1, blinkScale);
      ctx.beginPath();
      ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // ── End Voidling ────────────────────────────────────────────────────────

    // Play Button
    const playW = 200, playH = 60;
    const playX = fw/2 - playW/2, playY = fh * 0.52;
    UIHelper.drawButton(ctx, 'PLAY', playX, playY, playW, playH, CONFIG.COLORS.primaryButton, '#FFF');

    // Daily Button
    const dailyY = playY + 80;
    UIHelper.drawButton(ctx, 'DAILY BITE', playX, dailyY, playW, playH, '#FF8B94', '#FFF');
    
    // Streak
    ctx.fillStyle = '#FF4500';
    ctx.font = 'bold 16px Nunito';
    ctx.fillText(`Streak: ${meta.data.streak}`, fw/2, dailyY + 80);

    // Shop Button
    const shopY = dailyY + 120;
    UIHelper.drawButton(ctx, 'SHOP', playX, shopY, playW, playH, '#6EB5FF', '#FFF');

    if (clickEvent) {
      if (UIHelper.hitTest(clickEvent.x, clickEvent.y, playX, playY, playW, playH)) startGame(false);
      else if (UIHelper.hitTest(clickEvent.x, clickEvent.y, playX, dailyY, playW, playH)) state = GameState.DAILY_INTRO;
      else if (UIHelper.hitTest(clickEvent.x, clickEvent.y, playX, shopY, playW, playH)) state = GameState.SHOP;
    }
  };

  const drawDailyIntro = () => {
    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, fw, fh);

    // Title
    ctx.fillStyle = CONFIG.COLORS.uiText;
    ctx.font = 'bold 36px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('DAILY BITE', fw / 2, fh * 0.2);

    // Date
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    ctx.font = '20px Nunito, sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText(today, fw / 2, fh * 0.2 + 44);

    // Streak flame display
    const streak = meta.data.streak;
    ctx.font = 'bold 28px Fredoka, sans-serif';
    ctx.fillStyle = '#FF4500';
    ctx.fillText(`🔥 ${streak} day streak`, fw / 2, fh * 0.35);

    // Framing text
    ctx.font = '18px Nunito, sans-serif';
    ctx.fillStyle = CONFIG.COLORS.uiText;
    ctx.fillText('One map. Same layout for everyone today.', fw / 2, fh * 0.44);
    ctx.fillText('How much can you devour?', fw / 2, fh * 0.44 + 28);

    // Already played?
    const alreadyPlayed = meta.data.lastDailyDate === new Date().toDateString();
    if (alreadyPlayed) {
      ctx.font = 'bold 16px Nunito, sans-serif';
      ctx.fillStyle = '#FF8B94';
      ctx.fillText('You already played today! Watch an ad for another attempt.', fw / 2, fh * 0.54);
    }

    // GO button
    const btnW = 200, btnH = 60;
    const btnX = fw / 2 - btnW / 2, btnY = fh * 0.62;
    UIHelper.drawButton(ctx, alreadyPlayed ? 'WATCH AD & RETRY' : 'GO!', btnX, btnY, btnW, btnH, CONFIG.COLORS.primaryButton, '#FFF');

    // Back button
    const backW = 120, backH = 44;
    const backX = fw / 2 - backW / 2, backY = fh * 0.62 + 80;
    UIHelper.drawButton(ctx, 'BACK', backX, backY, backW, backH, '#AAA', '#FFF');

    if (clickEvent) {
      if (UIHelper.hitTest(clickEvent.x, clickEvent.y, btnX, btnY, btnW, btnH)) {
        if (alreadyPlayed) {
          // Show rewarded ad then allow retry
          AdService.showRewarded('daily_retry').then(() => startGame(true));
        } else {
          startGame(true);
        }
      } else if (UIHelper.hitTest(clickEvent.x, clickEvent.y, backX, backY, backW, backH)) {
        state = GameState.HOME;
      }
    }
  };

  const drawGame = (dt: number) => {
    if (!player) return;

    // Time logic
    timeLeft -= dt;
    if (timeLeft <= 0) {
      state = GameState.RESULTS;
      if (isDaily) meta.recordDaily();
      
      const percent = (world.eatenArea / world.totalStartArea) * 100;
      let grade = 'C';
      if (percent > 80) grade = 'S';
      else if (percent > 60) grade = 'A';
      else if (percent > 40) grade = 'B';
      
      meta.addCoins(Math.floor(player.score / 100));
      if (player.score > meta.data.highScore) {
        meta.data.highScore = player.score;
        meta.save();
      }

      track('round_end', { score: player.score, percent, grade });
      return;
    }

    if (timeLeft < nextBoonTime && nextBoonTime > 0) {
      // Trigger Boon
      state = GameState.BOON_PICK;
      audio.playBoon();
      const shuffled = [...CONFIG.BOONS].sort(() => 0.5 - Math.random());
      boonCards = shuffled.slice(0, 3);
      if (nextBoonTime === 60000) nextBoonTime = 30000;
      else nextBoonTime = 0;
      return;
    }

    // Camera targets player
    const camX = player.x - fw/2;
    const camY = player.y - fh/2;

    // Convert screen pointer to world coord
    const worldPointerX = camX + pointerX;
    const worldPointerY = camY + pointerY;

    // Updates
    player.update(dt, worldPointerX, worldPointerY, isDragging);
    // Keep player in bounds
    player.x = Math.max(0, Math.min(world.mapWidth, player.x));
    player.y = Math.max(0, Math.min(world.mapHeight, player.y));
    
    world.update(dt, player);
    fx.update(dt);

    // Draw
    ctx.fillStyle = CONFIG.COLORS.ground;
    ctx.fillRect(0, 0, fw, fh);
    
    // Pattern or path drawing here
    ctx.save();
    ctx.translate(-camX, -camY);

    const shake = fx.getShake();
    ctx.translate(shake.x, shake.y);

    world.draw(ctx);
    
    const skinDef = CONFIG.SKINS.find(s => s.id === meta.data.equippedSkin) || CONFIG.SKINS[0];
    player.draw(ctx, skinDef, world.drawObjectShape.bind(world));

    // ctx is already in world space (translated by -camX, -camY above), so pass 0,0
    fx.draw(ctx, 0, 0);
    ctx.restore();

    fx.drawFlash(ctx, fw, fh);

    // HUD
    ctx.fillStyle = CONFIG.COLORS.uiText;
    ctx.font = 'bold 32px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(formatTime(timeLeft), fw/2, 40);
    
    ctx.textAlign = 'right';
    ctx.fillText(`Score: ${player.score}`, fw - 20, 40);

    if (player.combo > 1) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFDA77';
      ctx.strokeStyle = '#2B2140';
      ctx.lineWidth = 4;
      ctx.font = 'bold 48px Fredoka';
      ctx.strokeText(`x${player.combo}`, fw/2, fh - 60);
      ctx.fillText(`x${player.combo}`, fw/2, fh - 60);
    }
  };

  const drawBoon = () => {
    ctx.fillStyle = 'rgba(43, 33, 64, 0.8)';
    ctx.fillRect(0, 0, fw, fh);

    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 36px Fredoka';
    ctx.textAlign = 'center';
    ctx.fillText('CHOOSE A BOON', fw/2, fh * 0.2);

    const cardW = fw * 0.8;
    const cardH = 100;
    const startY = fh * 0.3;

    for (let i = 0; i < boonCards.length; i++) {
      const b = boonCards[i];
      const y = startY + i * (cardH + 20);
      const x = fw/2 - cardW/2;
      
      UIHelper.drawButton(ctx, '', x, y, cardW, cardH, '#FFF', '#000');
      
      ctx.fillStyle = CONFIG.COLORS.uiText;
      ctx.font = 'bold 24px Nunito';
      ctx.textAlign = 'center';
      ctx.fillText(b.name, fw/2, y + 35);
      
      ctx.font = '16px Nunito';
      ctx.fillText(b.desc, fw/2, y + 70);

      if (clickEvent && UIHelper.hitTest(clickEvent.x, clickEvent.y, x, y, cardW, cardH)) {
        // Apply boon
        track('boon_pick', { id: b.id });
        if (b.id === 'magnet') player!.magnetMultiplier += 0.4;
        if (b.id === 'overdrive') player!.speedMultiplier += 0.25;
        if (b.id === 'twin') player!.twinMerge = true;
        if (b.id === 'time') timeLeft += 10000;
        if (b.id === 'tremor') player!.tremorActive = true;
        if (b.id === 'greed') player!.greedMultiplier += 0.5;
        
        state = GameState.GAME;
        clickEvent = null;
        break;
      }
    }
  };

  const drawResults = () => {
    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, fw, fh);

    ctx.fillStyle = CONFIG.COLORS.uiText;
    ctx.font = 'bold 48px Fredoka';
    ctx.textAlign = 'center';
    ctx.fillText('ROUND OVER', fw/2, fh * 0.2);

    const percent = (world.eatenArea / world.totalStartArea) * 100;
    
    ctx.font = 'bold 32px Nunito';
    ctx.fillText(`Score: ${player?.score}`, fw/2, fh * 0.35);
    ctx.fillText(`Devoured: ${percent.toFixed(1)}%`, fw/2, fh * 0.45);
    
    const coins = Math.floor((player?.score || 0) / 100);
    ctx.fillStyle = '#FFDA77';
    ctx.fillText(`+${coins} Coins`, fw/2, fh * 0.55);

    const btnW = 200, btnH = 60;
    const playX = fw/2 - btnW/2;
    
    UIHelper.drawButton(ctx, 'PLAY AGAIN', playX, fh * 0.7, btnW, btnH, CONFIG.COLORS.primaryButton, '#FFF');
    UIHelper.drawButton(ctx, 'HOME', playX, fh * 0.8, btnW, btnH, '#888', '#FFF');

    if (clickEvent) {
      if (UIHelper.hitTest(clickEvent.x, clickEvent.y, playX, fh * 0.7, btnW, btnH)) startGame(false);
      else if (UIHelper.hitTest(clickEvent.x, clickEvent.y, playX, fh * 0.8, btnW, btnH)) state = GameState.HOME;
    }
  };

  const drawShop = () => {
    ctx.fillStyle = CONFIG.COLORS.bg;
    ctx.fillRect(0, 0, fw, fh);

    ctx.fillStyle = CONFIG.COLORS.uiText;
    ctx.font = 'bold 36px Fredoka';
    ctx.textAlign = 'center';
    ctx.fillText('SKINS', fw/2, 60);
    
    ctx.font = '24px Nunito';
    ctx.fillText(`Coins: ${meta.data.coins}`, fw/2, 100);

    const cols = 2;
    const pad = 20;
    const w = (fw - pad * 3) / 2;
    const h = 120;
    let startY = 140;

    for (let i = 0; i < CONFIG.SKINS.length; i++) {
      const skin = CONFIG.SKINS[i];
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = pad + col * (w + pad);
      const y = startY + row * (h + pad);

      const owned = meta.data.skinsOwned.includes(skin.id);
      const equipped = meta.data.equippedSkin === skin.id;

      let bg = '#FFF';
      if (equipped) bg = '#A8E6CF';
      else if (!owned) bg = '#EEE';

      UIHelper.drawButton(ctx, '', x, y, w, h, bg, '#000');
      
      // Draw voidling preview
      ctx.save();
      ctx.translate(x + w/2, y + 40);
      
      ctx.shadowColor = skin.glow;
      ctx.shadowBlur = 10;
      ctx.fillStyle = skin.glow;
      ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = skin.body;
      ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI*2); ctx.fill();
      
      ctx.fillStyle = '#FFF';
      ctx.beginPath(); ctx.arc(-8, -4, 4, 0, Math.PI*2); ctx.arc(8, -4, 4, 0, Math.PI*2); ctx.fill();
      ctx.restore();

      ctx.fillStyle = CONFIG.COLORS.uiText;
      ctx.font = 'bold 16px Nunito';
      ctx.fillText(skin.name, x + w/2, y + 80);
      
      if (!owned) {
        ctx.fillStyle = '#FF8B94';
        ctx.fillText(`${skin.cost} C`, x + w/2, y + 105);
      } else if (equipped) {
        ctx.fillStyle = '#2B2140';
        ctx.fillText('Equipped', x + w/2, y + 105);
      }

      if (clickEvent && UIHelper.hitTest(clickEvent.x, clickEvent.y, x, y, w, h)) {
        if (owned && !equipped) {
          meta.equipSkin(skin.id);
        } else if (!owned && meta.data.coins >= skin.cost) {
          meta.addCoins(-skin.cost);
          meta.unlockSkin(skin.id);
          meta.equipSkin(skin.id);
        }
      }
    }

    const btnW = 120, btnH = 50;
    UIHelper.drawButton(ctx, 'BACK', fw/2 - btnW/2, fh - 80, btnW, btnH, '#888', '#FFF');
    if (clickEvent && UIHelper.hitTest(clickEvent.x, clickEvent.y, fw/2 - btnW/2, fh - 80, btnW, btnH)) {
      state = GameState.HOME;
    }
  };

  const loop = (time: number) => {
    rafId = requestAnimationFrame(loop);
    
    if (!lastTime) lastTime = time;
    const dt = time - lastTime;
    lastTime = time;
    
    // Prevent huge jumps if tab inactive
    if (dt > 100) return;

    accum += dt;
    while (accum >= CONFIG.TIMESTEP) {
      accum -= CONFIG.TIMESTEP;
      // Fixed timestep logical updates if needed, but we pass dt to our update fns
    }

    ctx.clearRect(0, 0, fw, fh);

    try {
      switch(state) {
        case GameState.HOME: drawHome(dt); break;
        case GameState.DAILY_INTRO: drawDailyIntro(); break;
        case GameState.GAME: drawGame(dt); break;
        case GameState.BOON_PICK: drawBoon(); break;
        case GameState.RESULTS: drawResults(); break;
        case GameState.SHOP: drawShop(); break;
      }
    } catch (err) {
      console.error('[VOIDLING] render error in state', state, err);
    }

    clickEvent = null;
  };

  rafId = requestAnimationFrame(loop);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    canvas.removeEventListener('pointerdown', handlePointer);
    canvas.removeEventListener('pointermove', handlePointer);
    canvas.removeEventListener('pointerup', handlePointer);
    canvas.removeEventListener('pointercancel', cancelDrag);
    canvas.removeEventListener('touchstart', handlePointer);
    canvas.removeEventListener('touchmove', handlePointer);
    canvas.removeEventListener('touchend', handlePointer);
    canvas.removeEventListener('touchcancel', cancelDrag);
  };
}
