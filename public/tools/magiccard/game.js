import arcana from './deck.js';
import minorArcana from './minor.js';

const $ = (id) => document.getElementById(id);
const fan = $("fan");
const spread = $("spread");
const primary = $("primary");
const announcement = $("announcement");
const backDialog = $("backs-dialog");
let activeRequest;
let poseVersion = 0;
let poseReady;
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const positions = ["来处", "当下", "下一步"];
const questions = [
  { topic: "姻缘", question: "怎样靠近合适的人？", symbol: "❀" },
  { topic: "前路", question: "下一步该往哪里走？", symbol: "✧" },
  { topic: "事业", question: "工作中该把力气放在哪？", symbol: "☉" },
];
const backStyles = [
  ["astral", "星轨"],
  ["rose", "暮玫"],
  ["forest", "月森"],
];
const stages = {
  foyer: ["NOCTURNE TAROT", "月下占卜屋", "窗边透着灯火。桌边，留着一把空椅。"],
  intro: ["薇拉", "坐我这边。", "慢慢来。今夜，你最想和我说哪件事？"],
  draw: ["薇拉", "循心选牌", "从我面前的牌中，挑出三张。"],
  flip: ["薇拉", "逐张揭晓", "先翻开左边这张，看看你是从哪里走来的。"],
  reading: ["NOCTURNE TAROT", "烛下回音", ""],
};

function changePose(name) {
  const host = $("host");
  if (host.dataset.pose === name) return poseReady;
  host.dataset.pose = name;
  const version = ++poseVersion;
  const rig = document.createElement("div");
  rig.className = "portrait-rig";
  rig.dataset.name = name;
  const pending = [];
  function layer(suffix, parent = rig) {
    const image = new Image();
    image.className = "layer-" + suffix;
    image.alt = "";
    image.src = `assets/salon/seat${name}${suffix}.webp`;
    parent.append(image);
    pending.push(image.decode());
  }
  layer("base");
  layer("head");
  const hand = document.createElement("div");
  hand.className = "acting-hand";
  rig.append(hand);
  if (name === "deal" || name === "think") {
    const grip = document.createElement("div");
    grip.className = "held-cards";
    (name === "think" ? hand : rig).append(grip);
    if (name === "deal") {
      [-48,-37,-25,-13,-1,11,23].forEach(angle => grip.append(propCard(null,angle)));
      layer("grip");
      rig.append(hand);
    }
  }
  layer("arm",hand);
  if (name === "welcome") {
    const received = propCard(null,-15);
    received.classList.add("received-card","card-away");
    hand.prepend(received);
  }
  poseReady = Promise.all(pending).catch(() => {
    const fallback = new Image();
    fallback.alt = "";
    fallback.src = `assets/salon/seat${name}.webp`;
    rig.prepend(fallback);
  }).then(() => {
    if (version !== poseVersion) return;
    const previous = host.lastElementChild;
    host.append(rig);
    if (previous) {
      previous.classList.add("leaving");
      setTimeout(() => previous.remove(),320);
    }
    return rig;
  });
  return poseReady;
}

function propCard(pick, angle) {
  const prop = document.createElement("span");
  prop.className = "prop-card";
  prop.style.setProperty("--angle", angle+"deg");
  if (pick) {
    prop.classList.add("face-up");
    const art = new Image();
    art.src = pick.card.art;
    art.alt = "";
    if (pick.orientation === "reversed") art.style.rotate = "180deg";
    const title = document.createElement("span");
    title.textContent = pick.card.title;
    prop.append(art,title);
  }
  return prop;
}

function cardPosition(el) {
  const rect = el.getBoundingClientRect();
  return {x:rect.left+rect.width/2,y:rect.top+rect.height/2,
    scale:el.offsetWidth/100,angle:parseFloat(el.style.getPropertyValue("--angle")) || 0};
}

// A captured starting position lets the three chosen cards survive the layout change.
async function carryCard(from,to,pick,current,duration,delay=0) {
  if (delay) await waitForMotion(delay);
  if (round !== current) return;
  const a = from instanceof Element ? cardPosition(from) : from;
  from.classList?.add("card-away");
  if (!reducedMotion.matches) {
    const flying = propCard(pick,0);
    flying.classList.add("travelling-card");
    flying.setAttribute("aria-hidden","true");
    document.body.append(flying);
    const b = cardPosition(to);
    const transform = (x,y,s,angle) => `translate(${x}px,${y}px) rotate(${angle}deg) scale(${s})`;
    const arc = Math.min(56,innerHeight*.065,Math.hypot(b.x-a.x,b.y-a.y)*.18);
    const keys = Array.from({length:25},(_,i) => {
      const t=i/24, rise=Math.sin(Math.PI*t);
      return {offset:t,transform:transform(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t-arc*rise,
        a.scale+(b.scale-a.scale)*t+.05*rise,a.angle+(b.angle-a.angle)*t-7*rise)};
    });
    const motion = flying.animate(keys,{duration,easing:"cubic-bezier(.32,.06,.19,1)",fill:"both"});
    try { await motion.finished; } catch { /* Reset cancels an in-flight gesture. */ }
    flying.remove();
  }
  if (round === current) to.classList.remove("card-away");
}
let round = newRound();
let fanCards = [];
let slots = [];

function newRound() {
  return { phase: "foyer", question: null, offered: [], picks: [], revealed: 0, inspected: -1, busy: false };
}

function randomBelow(limit) {
  const range = 0x100000000;
  const sample = new Uint32Array(1);
  const ceiling = range - (range % limit);
  do {
    crypto.getRandomValues(sample);
  } while (sample[0] >= ceiling);
  return sample[0] % limit;
}

function offerCards() {
  const shuffled = [...arcana, ...minorArcana];
  for (let index = shuffled.length - 1; index > 0; index--) {
    const target = randomBelow(index + 1);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled.slice(0, 7).map((card) => ({
    card,
    orientation: randomBelow(2) ? "upright" : "reversed",
  }));
}

function orientationName(pick) {
  return pick.orientation === "upright" ? "正位" : "逆位";
}

function waitForMotion(duration) {
  return new Promise((resolve) => setTimeout(resolve, reducedMotion.matches ? 30 : duration));
}

function announce(message) {
  announcement.textContent = message;
}

function setPhase(phase) {
  if (round.phase !== phase) $("desk-content").scrollTop = 0;
  round.phase = phase;
  document.body.dataset.phase = phase;
  const [overline, title, copy] = stages[phase];
  $("eyebrow").textContent = overline;
  $("phase-title").textContent = phase === "reading" ? round.question.question : title;
  $("phase-copy").textContent = phase === "draw" ? `${round.question.question} 从牌扇中选三张。` : copy;
  if (phase === "intro" && handledObject) $("phase-copy").textContent = roomObjects[handledObject].atTable;
  $("restart").hidden = ["foyer","intro"].includes(phase);
  $("bell").hidden = phase !== "foyer";
  fan.hidden = phase !== "draw";
  spread.hidden = !["flip","reading"].includes(phase);
  document.querySelectorAll(".steps li").forEach((step, index) => {
    const current = ["intro","draw","flip","reading"].indexOf(phase);
    if (index === current) step.setAttribute("aria-current", "step");
    else step.removeAttribute("aria-current");
    step.toggleAttribute("data-complete", index < current);
  });
  updateControls();
}

function updateControls() {
  const { phase, revealed, busy, picks } = round;
  $("questions").hidden = phase !== "intro";
  primary.hidden = phase !== "flip";
  primary.disabled = busy;
  $("draw-counter").hidden = phase !== "draw";
  $("count-label").textContent = `已选 ${picks.length} / 3`;
  document.querySelectorAll(".draw-dots i").forEach((dot, index) => {
    dot.classList.toggle("filled", index < picks.length);
  });
  if (phase === "flip") {
    $("primary-label").textContent = busy ? "揭牌中…" : revealed === 3 ? "听薇拉解读" : `翻开「${positions[revealed]}」`;
    if (revealed === 3) $("phase-copy").textContent = "三张牌都在这里了。让我把它们连起来，回答你的问题。";
  }
}

function makeFan() {
  const angles = [-27, -17, -8, 0, 8, 17, 27];
  const drops = [1.7, .85, .27, 0, .27, .85, 1.7];
  fan.className = "fan";
  fan.replaceChildren();
  fanCards = angles.map((angle, index) => {
    const distance = Math.abs(index - 3);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "fan-card";
    button.disabled = true;
    button.tabIndex = -1;
    button.toggleAttribute("data-center", !distance);
    button.setAttribute("aria-label", `抽取第 ${index + 1} 张候选牌`);
    button.style.setProperty("--offset", index - 3);
    button.style.setProperty("--drop", drops[index]);
    button.style.setProperty("--angle", `${angle}deg`);
    button.style.setProperty("--distance", distance);
    button.style.setProperty("--z", 8 - distance);
    button.innerHTML = '<span class="card-back" aria-hidden="true"></span>';
    button.addEventListener("click", () => choose(index));
    fan.append(button);
    return button;
  });
}

async function startDraw(question) {
  const current = round;
  if (current.phase !== "intro" || !questions.includes(question)) return;
  current.question = question;
  current.offered = offerCards();
  current.busy = true;
  const ready = changePose("deal");
  document.body.classList.add("table-prepared");
  fanCards.forEach(button => button.classList.add("card-away"));
  setPhase("draw");
  $("phase-title").focus({ preventScroll: true });
  $("phase-copy").textContent = {姻缘:"好，我们聊聊你想靠近的人。",前路:"好，我们一起看看，你想往哪里走。",事业:"嗯，说说工作。我们从你最在意的地方看起。"}[question.topic];
  const rig = await ready;
  if (!rig || round !== current) return;
  rig.classList.add("dealing");
  const deck = [...rig.querySelectorAll(".prop-card")].reverse();
  await Promise.all(fanCards.map((card,i) => carryCard(deck[i],card,null,current,580,i*135)));
  if (round !== current) return;
  rig.classList.remove("dealing");
  document.body.dataset.camera = "overhead";
  await waitForMotion(650);
  if (round !== current) return;
  await changePose("welcome");
  if (round !== current) return;
  $("phase-copy").textContent = `${question.question} 从牌扇中选三张。`;
  current.busy = false;
  fanCards.forEach((button) => {
    button.disabled = false;
    button.tabIndex = 0;
  });
  announce("洗牌完成，请从牌扇中选三张。");
}

async function choose(index) {
  const current = round;
  const button = fanCards[index];
  if (current.phase !== "draw" || current.busy || button.disabled) return;
  current.busy = true;
  current.picks.push(current.offered[index]);
  const tray = [...document.querySelectorAll(".draw-dots i")];
  const landing = tray[current.picks.length-1];
  landing.classList.add("card-away");
  const rig = $("host").querySelector(".portrait-rig:not(.leaving)");
  const palm = rig.querySelector(".received-card");
  const accepted = carryCard(button,palm,null,current,370);
  button.classList.add("is-picked");
  fanCards.forEach(card => {card.disabled = true;});
  rig.classList.add("accepting");
  updateControls();
  announce(`已选 ${current.picks.length} 张，共需 3 张。`);
  await accepted;
  if (round !== current) return;
  await waitForMotion(180);
  if (round !== current) return;
  await carryCard(palm,landing,null,current,370);
  if (round !== current) return;
  rig.classList.remove("accepting");
  if (current.picks.length < 3) {
    current.busy = false;
    fanCards.forEach(card => {card.disabled = card.classList.contains("is-picked");});
    $("phase-copy").textContent = current.picks.length === 1 ? "第一张收好了。再挑两张，相信你的直觉。" : "还差最后一张，选你目光停留的那一张。";
    const order = [...fanCards.slice(index + 1), ...fanCards.slice(0, index)];
    order.find((card) => !card.disabled)?.focus({ preventScroll: true });
    return;
  }

  current.busy = true;
  fanCards.forEach((card) => { card.disabled = true; });
  fan.classList.add("is-folding");
  buildSpread();
  const start = tray.map(cardPosition);
  changePose("welcome");
  slots.forEach(({button}) => button.classList.add("card-away"));
  setPhase("flip");
  refreshSlots();
  await Promise.all(slots.map(({button},i) => carryCard(start[i],button,null,current,440,i*90)));
  if (round !== current) return;
  current.busy = false;
  refreshSlots();
  updateControls();
  $("phase-title").focus({ preventScroll: true });
  announce("已抽满三张牌，可以翻开第一张。");
}

function buildSpread() {
  spread.replaceChildren();
  slots = round.picks.map((pick, index) => {
    const slot = document.createElement("div");
    slot.className = "spread-slot";
    slot.style.setProperty("--slot", index);
    slot.innerHTML = `
      <button type="button" class="spread-card">
        <span class="spindle" aria-hidden="true">
          <span class="card-back"></span>
          <span class="card-front">
            <span class="card-number"></span>
            <span class="card-portrait"><span class="fallback-art"></span></span>
            <span class="card-name"></span>
          </span>
        </span>
      </button>
      <span class="position"></span>`;
    const button = slot.querySelector("button");
    const position = slot.querySelector(".position");
    position.textContent = positions[index];

    const portrait = new Image();
    portrait.alt = "";
    portrait.decoding = "async";
    portrait.src = pick.card.art;
    button.addEventListener("click", () => {
      if (round.busy) return;
      if (index < round.revealed) showMeaning(index);
      else reveal(index);
    });
    spread.append(slot);
    return { button, position, portrait };
  });
}

function paintCard(index) {
  const pick = round.picks[index];
  const { card } = pick;
  const { button, portrait } = slots[index];
  button.dataset.motion = card.motion;
  button.toggleAttribute("data-reversed", pick.orientation === "reversed");
  button.querySelector(".card-number").textContent = card.number;
  button.querySelector(".fallback-art").textContent = card.symbol;
  const name = button.querySelector(".card-name");
  const direction = document.createElement("small");
  name.textContent = card.title;
  direction.textContent = orientationName(pick);
  name.append(direction);

  const art = button.querySelector(".card-portrait");
  if (portrait.complete && portrait.naturalWidth) art.prepend(portrait);
  else portrait.addEventListener("load", () => art.prepend(portrait), { once: true });
  if (!reducedMotion.matches) playPerformance(art, card);
}

function playPerformance(art, card) {
  const film = document.createElement("video");
  film.muted = true;
  film.playsInline = true;
  film.disablePictureInPicture = true;
  film.setAttribute("aria-hidden", "true");
  film.src = card.art.replace("/cards/", "/performances/").replace(".jpg", ".mp4");
  art.append(film);
  const play = () => film.play().catch(() => film.remove());
  film.addEventListener("playing", () => film.classList.add("playing"), { once: true });
  film.addEventListener("error", () => film.remove(), { once: true });
  film.addEventListener("ended", () => {
    if (!film.isConnected || reducedMotion.matches) return;
    film.currentTime = 1.5; // Skip the entrance when repeating the idle performance.
    play();
  });
  play();
}

function stopPerformances() {
  for (const film of spread.querySelectorAll("video")) {
    film.pause();
    film.removeAttribute("src");
    film.load();
    film.remove();
  }
}

function refreshSlots() {
  slots.forEach(({ button, position }, index) => {
    const opened = index < round.revealed;
    const next = index === round.revealed;
    button.disabled = round.busy || (!opened && !next);
    button.toggleAttribute("data-next", !round.busy && next);
    position.toggleAttribute("data-active", index === round.inspected || next);
    if (opened) {
      const pick = round.picks[index];
      button.setAttribute("aria-pressed", index === round.inspected);
      button.setAttribute("aria-label", `${positions[index]}，${pick.card.title}，${orientationName(pick)}，查看牌义`);
    } else {
      button.removeAttribute("aria-pressed");
      button.setAttribute("aria-label", next ? `翻开${positions[index]}` : `${positions[index]}，尚未翻开`);
    }
  });
}

function sparkle(button) {
  if (reducedMotion.matches) return;
  const burst = document.createElement("span");
  burst.className = "spark-burst";
  burst.setAttribute("aria-hidden", "true");
  for (let index = 0; index < 10; index++) {
    const angle = (index / 10) * Math.PI * 2;
    const reach = 45 + (index % 3) * 23;
    const mote = document.createElement("i");
    mote.style.setProperty("--sx", `${Math.round(Math.cos(angle) * reach)}px`);
    mote.style.setProperty("--sy", `${Math.round(Math.sin(angle) * reach * 1.25)}px`);
    burst.append(mote);
  }
  button.append(burst);
  setTimeout(() => burst.remove(), 1040);
}

async function reveal(index) {
  const current = round;
  if (current.phase !== "flip" || current.revealed !== index || index >= 3 || current.busy) return;
  const { button } = slots[index];
  const focused = document.activeElement;
  current.busy = true;
  paintCard(index);
  button.classList.add("is-flipped");
  sparkle(button);
  updateControls();
  refreshSlots();
  announce(`正在翻开${positions[index]}。`);
  await new Promise((resolve) => setTimeout(resolve, reducedMotion.matches ? 145 : 700));
  if (round !== current) return;
  current.revealed++;
  current.busy = false;
  showMeaning(index);
  updateControls();
  if ((focused === button || focused === primary) && document.activeElement === document.body) {
    const next = focused === button && current.revealed < 3 ? slots[current.revealed].button : primary;
    next.focus({ preventScroll: true });
  }
}

function showMeaning(index) {
  const pick = round.picks[index];
  const { tags, meaning } = pick.card[pick.orientation];
  round.inspected = index;
  if (round.phase === "flip" && round.revealed < 3) {
    $("phase-copy").textContent = `「${pick.card.title}」，${orientationName(pick)}。记住它带给你的第一印象，再看看「${positions[round.revealed]}」。`;
  }
  if (round.phase === "flip") {
    const current = round;
    changePose("think").then(rig => {
      if (!rig || current !== round || round.inspected !== index || round.phase !== "flip" || document.body.dataset.voice === "gathering") return;
      rig.querySelector(".held-cards").replaceChildren(propCard(pick,9));
    });
  }
  $("meaning-position").textContent = `${positions[index]} · ${orientationName(pick)}`;
  $("meaning-title").textContent = pick.card.title;
  $("meaning-en").textContent = pick.card.english;
  $("meaning-copy").textContent = meaning;
  $("meaning-tags").replaceChildren(...tags.map((tag) => {
    const item = document.createElement("li");
    item.textContent = tag;
    return item;
  }));
  $("meaning").hidden = false;
  if (!reducedMotion.matches) {
    $("meaning").animate([{ opacity: .35, translate: "0 4px" }, { opacity: 1, translate: "0 0" }], {
      duration: 370,
      easing: "ease-out",
    });
  }
  refreshSlots();
  const ready = round.revealed === 3 && round.phase === "flip" ? "三张牌均已翻开，可以查看三牌解读。" : "";
  announce(`${positions[index]}，${pick.card.title}，${orientationName(pick)}。${ready}`);
}

async function showReading() {
  if (round.revealed !== 3 || activeRequest) return;
  const current = round;
  const request = new AbortController();
  activeRequest = request;
  current.busy = true;
  refreshSlots();
  primary.disabled = true;
  setPhase("flip");
  $("reading").hidden = true;
  $("phase-copy").textContent = "让我把这三张牌拿近一点。";
  document.body.dataset.voice = "gathering";
  $("desk-content").scrollTop = 0;
  window.scrollTo({top:0,behavior:"instant"});
  delete document.body.dataset.camera;
  await waitForMotion(650);
  if (round !== current) return;
  const rig = await changePose("think");
  if (round !== current || !rig) return;
  const hand = rig.querySelector(".held-cards");
  hand.replaceChildren();
  const held = current.picks.map((pick,i) => {
    const card = propCard(pick,[-25,-5,15][i]);
    card.classList.add("card-away");
    hand.append(card);
    return card;
  });
  await Promise.all(held.map((card,i) => carryCard(slots[i].button,card,current.picks[i],current,640,190*i)));
  if (round !== current) return;
  setPhase("reading");
  document.body.dataset.voice = "thinking";
  $("reading").hidden = false;
  $("retry-reading").hidden = true;
  $("reading-story").textContent = "让我想想……";
  $("reading-title").focus({preventScroll:true});
  window.scrollTo({top:0,behavior:"instant"});
  let answer;
  try {
    const response = await fetch("/api/tarot/reading", {
      method: "POST", signal: request.signal, headers: {"Content-Type":"application/json"},
      body: JSON.stringify({topic:current.question.topic,cards:current.picks.map(({card,orientation})=>({id:card.id,orientation}))}),
    });
    if (!response.ok) throw Error("unavailable");
    const result = await response.json();
    if (typeof result.text !== "string" || !result.text.trim()) throw Error("empty");
    answer = result.text;
  } catch {
    if (round !== current || request.signal.aborted) return;
  }
  if (round !== current) return;
  await Promise.all(held.map((card,i) => carryCard(card,slots[i].button,current.picks[i],current,530,i*105)));
  if (round !== current) return;
  document.body.dataset.voice = answer ? "answer" : "paused";
  changePose(answer ? "answer" : "welcome");
  $("reading-story").textContent = answer || "暂时无法取得解读，可稍后重试。";
  $("retry-reading").hidden = Boolean(answer);
  activeRequest = null;
  current.busy = false;
  refreshSlots();
}

function reset() {
  delete document.body.dataset.camera;
  activeRequest?.abort();
  activeRequest = null;
  document.querySelectorAll(".draw-dots i").forEach(slot => slot.classList.remove("card-away"));
  document.querySelectorAll(".travelling-card").forEach(card => {
    card.getAnimations().forEach(animation => animation.cancel());
    card.remove();
  });
  delete document.body.dataset.voice;
  changePose("invite");
  stopPerformances();
  round = newRound();
  slots = [];
  spread.replaceChildren();
  makeFan();
  $("meaning").hidden = true;
  $("reading").hidden = true;
  for (const id of ["meaning-position", "meaning-title", "meaning-en", "meaning-tags", "meaning-copy", "reading-story"]) {
    $(id).replaceChildren();
  }
  setPhase("intro");
  $("phase-title").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "auto" : "smooth" });
  announce("牌已收回，可以开始新一局。");
}

function openBackPicker() {
  const options = $("back-options");
  if (!options.childElementCount) {
    for (const [key, name] of backStyles) {
      const option = document.createElement("button");
      const img = new Image(130, 195);
      img.src = `assets/backs/${key}.jpg`;
      img.alt = "";
      option.type = "button";
      option.className = "back-option";
      option.dataset.style = key;
      option.append(img, name);
      option.addEventListener("click", () => {
        document.body.dataset.back = key;
        backDialog.close();
        announce(`已更换为「${name}」牌背。`);
      });
      options.append(option);
    }
  }
  for (const option of options.children) {
    option.setAttribute("aria-pressed", option.dataset.style === document.body.dataset.back);
  }
  backDialog.showModal();
}

function soundTableBell() {
  if (!window.AudioContext) return;
  const audio = new AudioContext();
  const start = audio.currentTime;
  for (const [frequency, level, tail] of [[1036, .055, 1.05], [2502, .018, .48], [3830, .007, .22]]) {
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.frequency.value = frequency;
    gain.gain.setValueAtTime(.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, start + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, start + tail);
    tone.connect(gain).connect(audio.destination);
    tone.start(start);
    tone.stop(start + tail);
  }
  setTimeout(() => audio.close().catch(() => {}), 1200);
}

const windowVisits = [
  { pose:"turning", line:"来啦。要看看我在擦什么吗？", reply:"看看那盏灯", nextPose:"polishing", answer:"灯罩擦亮一点，夜里也看得清牌上的细线。" },
  { pose:"sorting", line:"这叠牌里，有一张在灯下特别好看。", reply:"给我看看", nextPose:"studying", answer:"你看，稍稍转过一点，金线就亮起来了。" },
  { pose:"turning", line:"听见了吗？窗外的树叶响了。", reply:"一起去窗边", nextPose:"backing", answer:"听，风正从树梢上走过去。" },
  { pose:"stargazing", line:"想看看星仪是怎么转的吗？", reply:"转动内环", nextPose:"stargazing", answer:"看这道光。内环转了，外环还指着原来的方向。" },
  { pose:"turning", line:"你也喜欢窗边的花？", reply:"留一枝在桌边", nextPose:"turning", answer:"那就放在我们中间。等会儿看牌时，你也能闻见。" }
];
const roomObjects = {
  lavender:{visit:4,first:"这束薰衣草刚晾好。喜欢这个香气吗？",reply:"留一枝在桌边",answer:"那就留在你手边。来，挑个舒服的位置坐。",again:"给你留的那枝还在。要带到桌边去吗？",atTable:"给你留的花就在手边。坐近些，今天想聊什么？"},
  lantern:{visit:0,first:"这盏铜灯的灯芯低了，要拨亮些吗？",reply:"拨亮灯芯",answer:"这就好了。你看，灯光连牌边的金线都照亮了。",again:"刚拨过的灯芯还很亮。借它的光看看牌？",atTable:"灯芯已经拨亮了。坐吧，今夜想问什么？"},
  window:{visit:2,first:"你也看见窗格里那点星光了？",reply:"一起去窗边",answer:"就在那片树梢上面。等眼睛习惯了夜色，就看得见。",again:"那颗星还在窗框的右上角。再陪我看一眼？",atTable:"刚才窗外那颗星还亮着。你心里有什么事？"},
  globe:{visit:3,first:"你碰到的是星仪的黄铜外环。试试里面这一圈？",reply:"转动内环",answer:"内环划过刻度，光斑也跟着挪了。再转半圈，就会回到起点。",again:"还能认出刚才转过的那道刻度吗？",atTable:"星仪还停在你选的刻度上。你想从哪件事说起？"}
};
let lastObject = null;
let handledObject = null;
const witchScene = document.querySelector(".window-witch");
const greeting = $("greet-witch");
const dialogue = $("witch-dialogue");
const reply = $("witch-reply");
let visitIndex = -1;
let visitTimer;
let arrivalTimer;

// The first pose is already on screen. Prepare the later walking cycle after first paint.
function loadWindowPoses() {
  $("window-back").src = "assets/salon/windowback.webp";
  if (!reducedMotion.matches) $("window-stride").style.backgroundImage = 'url("assets/salon/footsteps.webp")';
}
new ResizeObserver(() => {
  const figure = witchScene.querySelector(".turning").getBoundingClientRect();
  const figureHeight = figure.height;
  document.body.style.setProperty("--figure-height",figureHeight+"px");
  document.body.style.setProperty("--chair-x",(witchScene.offsetLeft + witchScene.offsetWidth/2)+"px");
  document.body.style.setProperty("--floor-y",figure.bottom+"px");
  document.body.style.setProperty("--step-travel",(-64*figureHeight/420)+"px");
}).observe(witchScene);
if (document.readyState === "complete") loadWindowPoses();
else window.addEventListener("load",loadWindowPoses,{once:true});
reducedMotion.addEventListener("change",loadWindowPoses);

function endVisit() {
  clearTimeout(visitTimer);
  clearTimeout(arrivalTimer);
  if (dialogue.contains(document.activeElement)) greeting.focus({preventScroll:true});
  dialogue.hidden = true;
  greeting.setAttribute("aria-expanded","false");
  delete witchScene.dataset.react;
  delete document.body.dataset.object;
  delete document.body.dataset.touched;
}

function linger() {
  clearTimeout(visitTimer);
  if (!dialogue.hidden && (reply.hidden || (!dialogue.matches(":focus-within") && !dialogue.matches(":hover")))) {
    visitTimer = setTimeout(endVisit,8500);
  }
}

function beginVisit(index,object) {
  if (round.phase !== "foyer" || $("bell").disabled) return;
  clearTimeout(arrivalTimer);
  visitIndex = index;
  const visit = windowVisits[visitIndex];
  const prop = roomObjects[object];
  delete document.body.dataset.touched;
  if (prop) document.body.dataset.object = object;
  else delete document.body.dataset.object;
  if (visit.pose === "stargazing") $("window-globe").src = `assets/salon/${reducedMotion.matches ? "globe":"starglobe"}.webp`;
  witchScene.dataset.react = visit.pose;
  greeting.setAttribute("aria-expanded","true");
  dialogue.hidden = false;
  $("witch-line").textContent = prop ? (lastObject === object ? prop.again : prop.first) : visit.line;
  reply.hidden = false;
  reply.textContent = prop?.reply || visit.reply;
  if (prop) lastObject = object;
  linger();
}
greeting.addEventListener("click", () => beginVisit((visitIndex+1)%windowVisits.length));
for (const object of $("room-objects").querySelectorAll("button")) {
  object.addEventListener("click", () => beginVisit(roomObjects[object.dataset.object].visit,object.dataset.object));
}

reply.addEventListener("click", () => {
  const visit = windowVisits[visitIndex];
  const object = document.body.dataset.object;
  if (object) {
    handledObject = object;
    if (object === "lavender") document.body.classList.add("flower-kept");
    document.body.dataset.touched = object;
  }
  greeting.focus({preventScroll:true});
  reply.hidden = true;
  clearTimeout(visitTimer);
  const respond = () => {
    witchScene.dataset.react = visit.nextPose;
    $("witch-line").textContent = roomObjects[object]?.answer || visit.answer;
    linger();
  };
  const route = witchScene.getAnimations().find(animation => animation.animationName === "window-route");
  if (visit.nextPose !== "backing" || !route || reducedMotion.matches) {
    respond();
    return;
  }
  // Rejoin the outward leg at her current distance, even if she was walking back.
  const cycle = route.effect.getTiming().duration;
  const phase = (route.currentTime % cycle) / cycle;
  const distance = Math.max(0,Math.min(1,(phase-.2)/.06,(.55-phase)/.06));
  const start = (.2 + distance*.06) * cycle;
  const animations = [...witchScene.getAnimations({subtree:true}),...$("witch-visit").getAnimations()];
  for (const animation of animations) {
    if (animation.effect.getTiming().duration === cycle) animation.currentTime = start;
  }
  delete witchScene.dataset.react;
  $("witch-line").textContent = "来，咱们到窗前听。";
  arrivalTimer = setTimeout(respond,(1-distance)*cycle*.06 + 180);
});
dialogue.addEventListener("pointerenter", () => clearTimeout(visitTimer));
dialogue.addEventListener("pointerleave", linger);
dialogue.addEventListener("focusin", () => clearTimeout(visitTimer));
dialogue.addEventListener("focusout", () => queueMicrotask(linger));
$("witch-visit").addEventListener("keydown", event => {
  if (event.key === "Escape") endVisit();
});

const arrivalBeats = ["turn","reach","lower","sit","offer"];
let arrivalArt;
function prepareArrival() {
  if (!arrivalArt) {
    arrivalArt = Promise.all([...arrivalBeats.map(n => "arrival"+n),"footsteps","windowchair"].map(async name => {
      const img = new Image();
      img.src = `assets/salon/${name}.webp`;
      await img.decode();
      return img;
    })).catch(error => { arrivalArt = null; throw error; });
  }
  return arrivalArt;
}
for (const event of ["pointerenter","focus"]) {
  $("bell").addEventListener(event,() => {
    if (!reducedMotion.matches) prepareArrival().catch(() => {});
  },{once:true});
}

async function finishStep() {
  const walk = $("window-stride");
  if (Number(getComputedStyle(walk).opacity)<.5) return;
  const route = witchScene.getAnimations().find(a => a.animationName==="window-route");
  if (!route) return;
  const time = route.currentTime % 30000;
  const elapsed = time >= 14700 ? time-14700 : time-6000;
  if (elapsed >= 0 && elapsed < 1800) {
    // At 0, 900 and 1800 ms both feet are in contact with the floor.
    await waitForMotion((900-elapsed%900)%900);
  }
}

async function performArrival(art) {
  await finishStep();
  const visible = [...witchScene.querySelectorAll("img,.walking")].reduce((a,b) =>
    Number(getComputedStyle(a).opacity) >= Number(getComputedStyle(b).opacity) ? a : b);
  const standing = witchScene.querySelector(".turning").getBoundingClientRect();
  const chairX = witchScene.offsetLeft+witchScene.offsetWidth/2;
  const figureX = standing.left+standing.width/2;
  const stepDistance = standing.height*64/420;
  const distance = Math.max(0,Math.min(1,(chairX-figureX)/stepDistance));
  const mustWalk = distance>.025;
  const profile = visible.classList.contains("walking");
  const leftFacing = profile && getComputedStyle(visible).transform !== "matrix(-1, 0, 0, 1, 0, 0)";
  const back = visible.classList.contains("backing");
  // A negative index mirrors a turning cel to begin from a left-facing profile.
  const turn = mustWalk ? (back ? [0,1,2] : leftFacing ? [-3,-4,4,3,2] : profile ? [2] : [4,3,2]) :
    (back ? [0,1,2,3,4] : leftFacing ? [-3,-4,4] : profile ? [2,3,4] : [4]);
  const turnTime = turn.length*65;
  const walkTime = mustWalk ? distance*1800 : 0;
  const faceTime = mustWalk ? 130 : 0;
  const approachEnd = turnTime+walkTime+faceTime;
  const settleTime = 20*60;
  const duration = approachEnd+settleTime+430;
  const canvas = document.createElement("canvas");
  canvas.className = "arrival-performance";
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  document.querySelector(".salon-scene").append(canvas);
  const startHeight = standing.height;
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight;
  const actorFraction = figureX/viewportWidth;
  const groundFraction = standing.bottom/viewportHeight;
  const chairFraction = chairX/viewportWidth;
  document.body.classList.add("taking-seat");
  setPhase("intro");
  try {
    await new Promise(resolve => {
      let start;
      let previousWidth, previousHeight, rig;
      function draw(now) {
        start ??= now;
        const t = Math.min(duration,now-start);
        const w = document.documentElement.clientWidth, h = window.innerHeight;
        if (w!==previousWidth || h!==previousHeight) {
          previousWidth=w; previousHeight=h;
          const dpr=Math.min(devicePixelRatio || 1,2);
          canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
          ctx.setTransform(canvas.width/w,0,0,canvas.height/h,0,0);
          rig=$("host").lastElementChild.getBoundingClientRect();
        }
        const close = Math.max(0,Math.min(1,(t-approachEnd-13*60)/(duration-approachEnd-13*60)));
        const lens = close*close*(3-2*close);
        const startScale=startHeight*h/viewportHeight/650;
        const scale=startScale+(rig.width/390-startScale)*lens;
        const x0=chairFraction*w-264*startScale, y0=groundFraction*h-702*startScale;
        const x=x0+(rig.left-51*rig.width/390-x0)*lens;
        const y=y0+(rig.top-187*rig.width/390-y0)*lens;
        document.body.style.setProperty("--arrival-close",lens);
        ctx.clearRect(0,0,w,h);
        ctx.drawImage(art[6],x,y,480*scale,720*scale);
        let frame;
        let offsetX = 0;
        const atWalk=t-turnTime;
        if (t<turnTime) {
          frame=turn[Math.floor(t/65)];
          offsetX=(actorFraction-chairFraction)*w;
        } else if (atWalk<walkTime) {
          const portion=atWalk/walkTime;
          offsetX=(actorFraction-chairFraction)*w*(1-portion);
          const step=Math.floor((1-distance+distance*portion)*48)%48;
          const height=650*scale, width=height*290/320;
          ctx.save();
          ctx.translate(x+264*scale+offsetX,y+702*scale);
          ctx.scale(-1,1);
          ctx.drawImage(art[5],step%8*290,Math.floor(step/8)*320,290,320,-width/2,-height,width,height);
          ctx.restore();
        } else if (t<approachEnd) {
          frame=t<approachEnd-65 ? 3 : 4;
        } else {
          frame=5+Math.min(19,Math.floor((t-approachEnd)/60));
        }
        if (frame!==undefined) {
          ctx.save();
          if (frame<0) {
            frame=-frame-1;
            ctx.translate(2*(x+264*scale+offsetX),0);
            ctx.scale(-1,1);
          }
          ctx.drawImage(art[Math.floor(frame/5)],frame%5*480,0,480,720,x+offsetX,y,480*scale,720*scale);
          ctx.restore();
        }
        if (t<duration && !reducedMotion.matches) requestAnimationFrame(draw);
        else resolve();
      }
      requestAnimationFrame(draw);
    });
  } finally {
    canvas.remove();
    document.body.classList.remove("taking-seat");
    document.body.style.removeProperty("--arrival-close");
  }
}

$("bell").addEventListener("click", async () => {
  if (round.phase !== "foyer" || $("bell").disabled) return;
  $("bell").disabled = true;
  clearTimeout(visitTimer);
  clearTimeout(arrivalTimer);
  $("witch-visit").hidden = true;
  $("room-objects").hidden = true;
  document.body.classList.add("bell-rung");
  try { soundTableBell(); } catch { /* The bell also has a visible cue. */ }
  $("questions").inert = true;
  try {
    const ready = changePose("invite");
    if (reducedMotion.matches) await ready;
    else {
      const [art] = await Promise.all([prepareArrival(),ready]);
      await performArrival(art);
    }
  } catch { await changePose("invite"); }
  endVisit();
  if (round.phase !== "intro") setPhase("intro");
  $("questions").inert = false;
  $("phase-title").focus({preventScroll:true});
  document.body.classList.remove("bell-rung");
  $("bell").disabled = false;
});
primary.addEventListener("click", () => {
  if (round.phase !== "flip") return;
  if (round.revealed === 3) showReading();
  else reveal(round.revealed);
});
for (const question of questions) {
  const choice = document.createElement("button");
  choice.type = "button";
  const label = document.createElement("strong");
  const icon = document.createElement("i");
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = question.symbol;
  label.append(icon, question.topic);
  const detail = document.createElement("small");
  detail.textContent = question.question;
  choice.append(label, detail);
  choice.addEventListener("click", () => startDraw(question));
  $("questions").append(choice);
}
reducedMotion.addEventListener("change", () => {
  if (reducedMotion.matches) stopPerformances();
  else slots.forEach(({button}, index) => {
    if (button.classList.contains("is-flipped")) {
      playPerformance(button.querySelector(".card-portrait"), round.picks[index].card);
    }
  });
});
$("restart").addEventListener("click", reset);
$("read-again").addEventListener("click", reset);
$("back-picker").addEventListener("click", openBackPicker);
$("retry-reading").addEventListener("click", showReading);
makeFan();
setPhase("foyer");
document.body.inert = false;
document.body.removeAttribute("aria-busy");
