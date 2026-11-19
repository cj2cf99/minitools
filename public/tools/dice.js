import { DiceMotion } from './dice/motion.js';

const RangeDice = (() => {
  const minimum = 3;
  const maximum = 30;
  const maxFaces = 8;
  const wordSpace = 2 ** 32;
  const randomWord = new Uint32Array(1);

  function validBound(value) {
    return Number.isInteger(value) && value >= minimum && value <= maximum;
  }

  function validBounds(lower, upper) {
    return validBound(lower) && validBound(upper) && lower <= upper;
  }

  function plan(upper) {
    const count = Math.ceil(upper / maxFaces);
    // Start from D4s, then add pairs of faces to reach the smallest usable capacity.
    const extraPairs = Math.max(0, Math.ceil(upper / 2) - count * 2);
    const eights = Math.floor(extraPairs / 2);
    const sixes = extraPairs % 2;
    return [
      ...Array(count - eights - sixes).fill(4),
      ...Array(sixes).fill(6),
      ...Array(eights).fill(8),
    ];
  }

  function uniform(limit) {
    if (limit === 1) return 0;
    const cutoff = wordSpace - wordSpace % limit;
    do {
      crypto.getRandomValues(randomWord);
    } while (randomWord[0] >= cutoff);
    return randomWord[0] % limit;
  }

  function roll(lower, upper) {
    // Draw the total first so every possible sum has the same chance.
    const score = lower + uniform(upper - lower + 1);
    const ending = uniform(2) === 0 ? 'forward' : 'back';
    const faces = plan(upper).slice(0, score);
    let remaining = score;
    let capacityAhead = faces.reduce((sum, sides) => sum + sides, 0);
    const dice = faces.map((sides, i) => {
      capacityAhead -= sides;
      const minimumHere = Math.max(1, remaining - capacityAhead);
      const maximumHere = Math.min(sides, remaining - (faces.length - i - 1));
      const value = minimumHere + uniform(maximumHere - minimumHere + 1);
      remaining -= value;
      return { sides, value };
    });
    dice.at(-1).ending = ending;
    return { score, dice };
  }

  return { validBound, validBounds, plan, roll };
})();

export function mount(el, heading) {
  heading.querySelector('h1').insertAdjacentHTML('afterend', `
    <details id="dice-settings" class="dice-disclosure" name="dice-header-panels">
      <summary>设置 <span id="range-summary" class="range-summary">3–30</span></summary>
      <div class="dice-panel">
        <div class="settings-content">
          <div class="bounds">
            <label for="lower">最小值<input id="lower" form="roll-form" name="lower" type="number" inputmode="numeric" min="3" max="30" step="1" value="3" required></label>
            <label for="upper">最大值<input id="upper" form="roll-form" name="upper" type="number" inputmode="numeric" min="3" max="30" step="1" value="30" required></label>
          </div>
          <fieldset class="mode-picker" id="mode-picker">
            <legend class="dice-sr-only">骰台样式</legend>
            <label class="mode-option">
              <input class="dice-sr-only" type="radio" name="dice-mode" value="flat" checked>
              <span class="mode-body"><span class="mode-code">2D</span>卡通骰</span>
            </label>
            <label class="mode-option">
              <input class="dice-sr-only" type="radio" name="dice-mode" value="solid">
              <span class="mode-body"><span class="mode-code">3D</span>镜面骰</span>
            </label>
          </fieldset>
        </div>
        <p class="dice-error" id="input-error" role="alert" hidden>请输入 3–30 之间的整数，最小值不能大于最大值。</p>
      </div>
    </details>
    <details id="result-details" class="dice-disclosure" name="dice-header-panels" hidden>
      <summary>点数明细</summary>
      <div class="dice-panel result-details-content">
        <span id="dice-labels" data-dice></span>
        <p id="calculation"></p>
      </div>
    </details>`);
  el.innerHTML = `
    <div class="dice-tool">
      <form id="roll-form">
        <section class="stage flat" id="dice-stage" aria-label="2D 卡通骰">
          <div class="dice-scene">
            <canvas id="dice-canvas" aria-hidden="true"></canvas>
          </div>
          <div class="dice-actions">
            <input id="roll-button" type="submit" value="掷骰子">
            <div class="roll-result">
              <span id="result-label">点数</span>
              <output class="result-number" id="result" for="lower upper" aria-labelledby="result-label">–</output>
            </div>
          </div>
        </section>
        <p class="dice-error" id="roll-error" role="alert" hidden>网页随机数暂不可用，请重试。</p>
      </form>
    </div>`;
  const form = el.querySelector('#roll-form');
  const settings = heading.querySelector('#dice-settings');
  const lowerInput = settings.querySelector('#lower');
  const upperInput = settings.querySelector('#upper');
  const button = el.querySelector('#roll-button');
  const inputError = settings.querySelector('#input-error');
  const rollError = el.querySelector('#roll-error');
  const resultDetails = heading.querySelector('#result-details');
  const result = el.querySelector('#result');
  const calculation = resultDetails.querySelector('#calculation');
  const rangeSummary = settings.querySelector('#range-summary');
  const stage = el.querySelector('#dice-stage');
  const diceLabel = resultDetails.querySelector('#dice-labels');
  const modePicker = settings.querySelector('#mode-picker');
  const renderer = DiceMotion.createStage(el.querySelector('#dice-canvas'));
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let rolling = false;
  let animationFrame;

  function displayDice(dice) {
    diceLabel.replaceChildren(...dice.map(({ sides, value }) => {
      const token = document.createElement('span');
      token.className = 'face-token';
      token.textContent = `D${sides} · ${value}`;
      return token;
    }));
  }

  function updateMode() {
    const flat = modePicker.querySelector('input:checked').value === 'flat';
    stage.classList.toggle('flat', flat);
    stage.classList.toggle('solid', !flat);
    stage.setAttribute('aria-label', flat ? '2D 卡通骰' : '3D 镜面骰');
    renderer.setFlat(flat);
  }

  function displayReady() {
    const lower = lowerInput.valueAsNumber, upper = upperInput.valueAsNumber;
    const valid = RangeDice.validBounds(lower, upper);
    rangeSummary.textContent = valid ? `${lower}–${upper}` : '—';
    if (!valid) return;
    const dice = DiceMotion.placeDice(RangeDice.plan(upper).map(sides => ({ sides, value: null })));
    result.value = '–';
    stage.classList.remove('is-revealed');
    resultDetails.open = false;
    resultDetails.hidden = true;
    renderer.render(dice, null);
  }

  function describe({ score, dice }) {
    if (dice.length === 1) return `骰面点数 ${score}`;
    return `${dice.map(die => die.value).join(' + ')} = ${score}`;
  }

  function setRolling(value) {
    rolling = value;
    stage.classList.toggle('is-rolling', value);
    button.disabled = lowerInput.disabled = upperInput.disabled = value;
    button.value = value ? '翻滚中' : '掷骰子';
  }

  form.noValidate = true;
  modePicker.addEventListener('change', updateMode);
  for (const panel of [settings, resultDetails]) {
    panel.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !panel.open) return;
      panel.open = false;
      panel.querySelector('summary').focus();
    });
  }
  settings.querySelector('.bounds').addEventListener('input', () => {
    inputError.hidden = true;
    lowerInput.removeAttribute('aria-invalid');
    upperInput.removeAttribute('aria-invalid');
    displayReady();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (rolling) return;
    const lower = lowerInput.valueAsNumber;
    const upper = upperInput.valueAsNumber;
    rollError.hidden = true;
    if (!RangeDice.validBounds(lower, upper)) {
      inputError.hidden = false;
      settings.open = true;
      const invalid = RangeDice.validBound(lower) ? upperInput : lowerInput;
      invalid.setAttribute('aria-invalid', 'true');
      invalid.focus();
      return;
    }
    inputError.hidden = true;
    let outcome;
    try {
      outcome = RangeDice.roll(lower, upper);
    } catch {
      rollError.hidden = false;
      return;
    }
    const dice = DiceMotion.placeDice(outcome.dice, true);
    const restoreFocus = document.activeElement === button || settings.contains(document.activeElement);
    settings.open = false;
    resultDetails.open = false;
    setRolling(true);
    stage.classList.remove('is-revealed');
    result.value = '–';
    calculation.textContent = '翻滚中…';
    diceLabel.replaceChildren();
    const reduced = motionPreference.matches;
    const duration = DiceMotion.duration(reduced, dice.length);
    const start = performance.now();

    function frame(now) {
      const elapsed = now - start;
      if (elapsed < duration) {
        renderer.render(dice, elapsed, reduced);
        animationFrame = requestAnimationFrame(frame);
        return;
      }
      renderer.render(dice, null, reduced);
      displayDice(dice);
      result.value = String(outcome.score);
      calculation.textContent = describe(outcome);
      resultDetails.hidden = false;
      stage.classList.add('is-revealed');
      setRolling(false);
      if (restoreFocus && document.activeElement === document.body) button.focus({preventScroll: true});
    }

    animationFrame = requestAnimationFrame(frame);
  });

  updateMode();
  displayReady();

  return () => {
    cancelAnimationFrame(animationFrame);
    renderer.dispose();
    settings.remove();
    resultDetails.remove();
  };
}
