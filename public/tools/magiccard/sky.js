"use strict";

(() => {
  const canvas = document.getElementById("sky");
  const context = canvas.getContext("2d");
  if (!context) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const chart = document.createElement("canvas");
  const engraving = chart.getContext("2d");
  const tau = 2 * Math.PI;
  const stars = Array.from({ length: 155 }, () => ({
    x: Math.random(), y: Math.random(), size: .35 + Math.random() * 1.16,
    seed: Math.random() * tau, gold: Math.random() > .37,
  }));
  const constellations = [
    [[.073, .51], [.111, .46], [.146, .49], [.186, .388], [.212, .41]],
    [[.78, .37], [.816, .426], [.854, .409], [.9, .49], [.94, .45]],
    [[.096, .77], [.144, .74], [.172, .802], [.222, .754]],
    [[.795, .742], [.848, .785], [.879, .72], [.925, .732]],
  ];
  let width, height, ratio, centerX, centerY, radius;
  let frameId = 0;
  let previousTime = -1000;

  function cross(ctx, x, y, size) {
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.quadraticCurveTo(x + .35, y - .45, x + size * .72, y);
    ctx.quadraticCurveTo(x + .35, y + .45, x, y + size);
    ctx.quadraticCurveTo(x - .35, y + .45, x - size * .72, y);
    ctx.quadraticCurveTo(x - .35, y - .45, x, y - size);
    ctx.fill();
  }

  function inscribe() {
    engraving.clearRect(0, 0, width, height);
    engraving.save();
    engraving.translate(centerX, centerY);
    engraving.lineWidth = .75;
    const rings = [1, .971, .88, .77, .61, .395];
    rings.forEach((ring, index) => {
      engraving.strokeStyle = `rgba(208, 179, 129, ${index < 3 ? .21 : .108})`;
      engraving.beginPath();
      engraving.arc(0, 0, radius * ring, 0, tau);
      engraving.stroke();
    });
    for (let mark = 0; mark < 120; mark++) {
      const angle = mark * tau / 120;
      const primary = mark % 10 === 0;
      const inner = radius * (primary ? .902 : .942);
      const outer = radius * .963;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      engraving.strokeStyle = primary ? "#bfa16a5b" : "#bfa16a36";
      engraving.beginPath();
      engraving.moveTo(x * inner, y * inner);
      engraving.lineTo(x * outer, y * outer);
      engraving.stroke();
      if (primary) {
        engraving.fillStyle = "#d6b78082";
        cross(engraving, x * radius * .849, y * radius * .849, mark % 30 === 0 ? 6 : 3.5);
      }
    }
    engraving.strokeStyle = "#ceb17c25";
    for (let axis = 0; axis < 8; axis++) {
      const angle = axis * tau / 8;
      const x = Math.cos(angle);
      const y = Math.sin(angle);
      engraving.beginPath();
      engraving.moveTo(x * radius * .41, y * radius * .41);
      engraving.lineTo(x * radius * 1.035, y * radius * 1.035);
      engraving.stroke();
    }
    engraving.restore();
    for (const constellation of constellations) {
      engraving.beginPath();
      constellation.forEach(([x, y], index) => {
        if (index === 0) engraving.moveTo(x * width, y * height);
        else engraving.lineTo(x * width, y * height);
      });
      engraving.strokeStyle = "#ad99694f";
      engraving.stroke();
      constellation.forEach(([x, y], index) => {
        engraving.fillStyle = index === 2 ? "#f7d6a7ae" : "#d3ad747c";
        cross(engraving, x * width, y * height, index === 2 ? 6 : 2.5);
      });
    }
  }

  function paint(time) {
    context.clearRect(0, 0, width, height);
    context.drawImage(chart, 0, 0, width, height);
    for (const star of stars) {
      const flicker = .57 + .34 * Math.sin(star.seed + time * .0008);
      context.fillStyle = star.gold ? `rgba(238, 191, 116, ${flicker * .74})` : `rgba(175, 192, 221, ${flicker * .57})`;
      const x = width * star.x;
      const y = height * star.y;
      if (star.size > 1.43) cross(context, x, y, 2.8 + flicker * 2.6);
      else {
        context.beginPath();
        context.arc(x, y, star.size, 0, tau);
        context.fill();
      }
    }
    for (let point = 0; point < 3; point++) {
      const angle = point * tau / 3 + time * .00015;
      const x = centerX + Math.cos(angle) * radius * .97;
      const y = centerY + Math.sin(angle) * radius * .97;
      context.fillStyle = "#ffe1a4aa";
      cross(context, x, y, 4.9);
    }
  }

  function resize() {
    ({ width, height } = canvas.getBoundingClientRect());
    ratio = Math.min(devicePixelRatio || 1, 1.6);
    canvas.width = chart.width = Math.round(width * ratio);
    canvas.height = chart.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    engraving.setTransform(ratio, 0, 0, ratio, 0, 0);
    centerX = width / 2;
    centerY = width < 621 ? 331 : Math.min(452, height * .56 + 16);
    radius = Math.min(width * .46, 346);
    inscribe();
    paint(still.matches ? 0 : performance.now());
  }

  function tick(time) {
    if (time - previousTime >= 38) {
      previousTime = time;
      paint(time);
    }
    frameId = requestAnimationFrame(tick);
  }

  function updateMotion() {
    cancelAnimationFrame(frameId);
    if (document.hidden) return;
    if (still.matches) paint(0);
    else frameId = requestAnimationFrame(tick);
  }

  resize();
  new ResizeObserver(resize).observe(canvas);
  still.addEventListener("change", updateMotion);
  document.addEventListener("visibilitychange", updateMotion);
  updateMotion();
})();
