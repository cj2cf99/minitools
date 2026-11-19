import { diceMeshes } from './dice-meshes.js';

export const DiceMotion = (() => {
  const TAU = 2 * Math.PI;
  const release = 142;
  const flightTimes = [440, 332, 226, 149];
  const lastLanding = release + flightTimes.reduce((total, flight) => total + flight, 0);
  const rollTime = lastLanding + 610;
  const shortRollTime = 445;
  const stagger = 67;
  const edgeStart = lastLanding;
  const edgeTime = 940;
  const shortEdgeStart = 215;
  const shortEdgeTime = 390;
  const edgeDecision = .58;
  const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const length = p => Math.hypot(...p);
  const scale = (p, amount) => p.map(c => c * amount);
  const unit = p => scale(p, 1 / (length(p) || 1));
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sub = (a, b) => a.map((coordinate, index) => coordinate - b[index]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const level = unit([0, .95, .33]);
  const alongTable = point => sub(point, scale(level, dot(point, level)));
  const facingCamera = unit(alongTable([0, 0, 1]));
  const colors = [{ face: '#ae81ff', edge: '#7750bf', light: '#fbe0ff', lacquer: [103, 63, 153] },
                  { face: '#efdb58', edge: '#aa7834', light: '#fff6ae', lacquer: [116, 104, 43] },
                  { face: '#ff985a', edge: '#c65948', light: '#ffdfb4', lacquer: [137, 61, 42] },
                  { face: '#59d8ed', edge: '#3089b3', light: '#d5fcff', lacquer: [38, 103, 124] }];
  const dieWidths = [.218, .153, .114, .089];
  const readySpots = [
    [[.50, .70]],
    [[.32, .58], [.68, .76]],
    [[.26, .68], [.50, .49], [.73, .76]],
    [[.24, .52], [.53, .47], [.42, .77], [.75, .71]],
  ];
  const throws = [
    { start: .14, speed: 2.65, side: .34, depth: -.075, rise: 1 },
    { start: .26, speed: 2.82, side: -.09, depth: .035, rise: .79 },
    { start: .105, speed: 3.63, side: .12, depth: -.135, rise: 1.08 },
    { start: .20, speed: 4.30, side: .07, depth: -.08, rise: .91 },
  ];
  const profiles = {
    4: [[0, -.98], [.89, .58], [.75, .78], [-.75, .78], [-.89, .58]],
    6: [[-.64, -.8], [.64, -.8], [.8, -.64], [.8, .64], [.64, .8], [-.64, .8], [-.8, .64], [-.8, -.64]],
    8: [[0, -.97], [.82, -.13], [.78, .23], [0, .93], [-.78, .23], [-.82, -.13]],
  };
  const prepared = new Map();
  const tippingCorners = new Map();
  const landingEnvelopes = new Map();

  function flatRestAngle(index) {
    return index === 0 ? -.15 : .10;
  }

  function placeDice(dice, randomize = false) {
    const spots = (randomize ? sampleSpots(dice) : null) ?? readySpots[dice.length - 1];
    return dice.map((die, i) => ({ ...die, spot: spots[i] }));
  }

  function depthScale(y) {
    return 1 + .48 * (y - .68);
  }

  function sampleSpots(dice) {
    const radius = dieWidths[dice.length - 1];
    // The widest supported single-column stage has a height-to-width ratio above .53.
    const heightRadius = Math.min(.229, radius / .53);
    const envelopes = dice.map(landingEnvelope);
    const footprint = ({left, right, height}, x, y) => {
      const depth = depthScale(y);
      return [x + left * radius * depth, y - height * heightRadius * depth, x + right * radius * depth, y];
    };
    for (let pass = 0; pass < 36; pass += 1) {
      const spots = [];
      const occupied = [];
      // The last die needs more clearance at the edges while it tips.
      for (let i = dice.length - 1; i >= 0; i -= 1) {
        const {rest, sweep} = envelopes[i];
        for (let attempt = 0; attempt < 48; attempt += 1) {
          const x = mix(.19, .82, Math.random());
          const y = mix(.465, .795, Math.random());
          if (((x - .51) / .397) ** 2 + ((y - .646) / .187) ** 2 > 1) continue;
          const [minX, minY, maxX] = footprint(sweep, x, y);
          if (minX < .025 || maxX > .975 || minY < .10) continue;
          const box = footprint(rest, x, y);
          if (occupied.some(other => box[0] < other[2] + .012 && box[2] > other[0] - .012
              && box[1] < other[3] + .016 && box[3] > other[1] - .016)) continue;
          spots[i] = [x, y];
          occupied.push(box);
          break;
        }
        if (!spots[i]) break;
      }
      if (occupied.length !== dice.length) continue;
      const depths = spots.map(spot => spot[1]);
      if (dice.length === 1 || Math.max(...depths) - Math.min(...depths) >= .10) return spots;
    }
    return null;
  }

  function meshFor(sides) {
    if (prepared.has(sides)) return prepared.get(sides);
    const mesh = diceMeshes[sides];
    const faces = mesh.f.map(([score, ...indices]) => {
      const points = indices.map(index => mesh.v[index]);
      const center = [0, 1, 2].map(axis => points.reduce((sum, point) => sum + point[axis], 0) / points.length);
      const normal = unit(cross(sub(points[1], points[0]), sub(points[2], points[0])));
      const inradius = Math.min(...points.map((point, i) => {
        const edge = sub(points[(i + 1) % points.length], point);
        return length(cross(edge, sub(center, point))) / length(edge);
      }));
      return { score, indices, center, normal, inradius };
    });
    const scoring = faces.slice().sort((a, b) => a.score - b.score);
    for (const face of scoring) {
      face.rest = groundedPose(face, faces);
      const [w, x, y, z] = face.rest;
      const up = rotate([w, -x, -y, -z], level);
      face.horizontal = unit(cross(up, face.normal));
      face.vertical = cross(face.normal, face.horizontal);
    }
    const model = { vertices: mesh.v, faces, scoring };
    prepared.set(sides, model);
    return model;
  }

  function path(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
  }

  function ellipse(ctx, x, y, width, height, fill, stroke) {
    ctx.beginPath();
    ctx.ellipse(x, y, width, height, 0, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  function surface(ctx, width, height, flat) {
    const glow = ctx.createRadialGradient(width * .54, height * .57, 0, width * .53, height * .55, width * .65);
    if (flat) {
      glow.addColorStop(0, '#f6e6ff');
      glow.addColorStop(.60, '#e9d0ff');
      glow.addColorStop(1, '#cfa7f1');
    } else {
      glow.addColorStop(0, '#426560');
      glow.addColorStop(.58, '#243f3d');
      glow.addColorStop(1, '#122023');
    }
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    if (flat) {
      const tray = [[.10,.17],[.89,.17],[.95,.26],[.95,.79],[.90,.86],[.095,.86],[.045,.79],[.045,.265]];
      const outline = tray.map(([x, y]) => [width * x, height * y]);
      path(ctx, outline);
      ctx.fillStyle = '#fbf2ff43';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#683f9470';
      ctx.stroke();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = '#8253a441';
      ctx.beginPath();
      for (let y = 7; y < height; y += 10) {
        for (let x = 8 + (Math.round(y / 10) % 2) * 5; x < width; x += 10) {
          const dot = .52 + 1.6 * Math.min(1, Math.abs(x / width - .53) ** 1.7 + Math.abs(y / height - .44) ** 1.6);
          ctx.moveTo(x + dot, y);
          ctx.arc(x, y, dot, 0, TAU);
        }
      }
      ctx.fill();
      ctx.setLineDash([3, 7]);
      ellipse(ctx, width * .52, height * .57, width * .405, height * .277, null, '#7d47af4f');
      ctx.setLineDash([]);
      ellipse(ctx, width * .165, height * .69, width * .102, height * .105, null, '#835aaf36');
      ctx.restore();
    } else {
      ctx.lineWidth = 1;
      const horizon = height * .32;
      const spotlight = ctx.createRadialGradient(width * .34, height * .21, 0, width * .47, height * .53, width * .56);
      spotlight.addColorStop(0, '#a5ddad25');
      spotlight.addColorStop(.65, '#a5ddad09');
      spotlight.addColorStop(1, '#a5ddad00');
      ctx.fillStyle = spotlight;
      ctx.fillRect(0, 0, width, height);
      const farRim = ctx.createLinearGradient(0, horizon - 10, 0, height);
      farRim.addColorStop(0, '#b1eed300');
      farRim.addColorStop(.39, '#b1eed319');
      farRim.addColorStop(.73, '#c7edda09');
      farRim.addColorStop(1, '#c7edda00');
      ctx.strokeStyle = farRim;
      ctx.beginPath();
      for (let i = -11; i <= 11; i += 1) {
        ctx.moveTo(width * (.50 + i * .013), horizon);
        ctx.lineTo(width * (.50 + i * .119), height);
      }
      for (let i = 1; i < 9; i += 1) {
        const y = horizon + i ** 2 / 70 * (height - horizon);
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      const table = ctx.createLinearGradient(0, height * .43, 0, height * .887);
      table.addColorStop(0, '#95c9ad17');
      table.addColorStop(.54, '#6bac913a');
      table.addColorStop(1, '#243d3cf2');
      ellipse(ctx, width * .51, height * .668, width * .444, height * .223, '#060c10b0', '#52676085');
      ellipse(ctx, width * .51, height * .646, width * .444, height * .219, table, '#a6cdaf6a');
      ellipse(ctx, width * .51, height * .646, width * .422, height * .198, null, '#b7dfbb36');
    }
    let grain = 1631;
    for (let i = 0; i < width * height / 38; i += 1) {
      grain = (Math.imul(grain, 1664525) + 1013904223) >>> 0;
      const x = (grain & 0xffff) / 65536 * width;
      const y = (grain >>> 16) / 65536 * height;
      ctx.fillStyle = flat ? '#9b4ec609' : i % 3 ? '#f1fff507' : '#04040a16';
      ctx.fillRect(x, y, 1, 1);
    }
  }

  function flightAt(time) {
    let start = release;
    for (const [index, duration] of flightTimes.entries()) {
      const age = time - start;
      if (age < duration) {
        // With constant gravity, height is proportional to flight time squared.
        const lift = 4 * age * (duration - age) / flightTimes[0] ** 2;
        return { lift, impactAge: age, impactStrength: index === 0 ? 0 : .67 ** (index - 1) };
      }
      start += duration;
    }
    return { lift: 0, impactAge: time - start, impactStrength: .67 ** 3 };
  }

  function edgeProgress(age, reduced) {
    return clamp((age - (reduced ? shortEdgeStart : edgeStart)) / (reduced ? shortEdgeTime : edgeTime));
  }

  function tipAngle(progress, angle, forward) {
    if (!forward) {
      const limit = angle * .944;
      if (progress <= edgeDecision) return limit * (1 - .64 * (1 - progress / edgeDecision) ** 2.35);
      return limit * (1 - smooth((progress - edgeDecision) / (1 - edgeDecision)));
    }
    // Keep a small, continuous angular velocity through the balance point.
    const speed = .082 * angle;
    if (progress <= edgeDecision) {
      const left = 1 - progress / edgeDecision;
      const lead = Math.min(.25, .44 * angle);
      return angle + (lead - speed * edgeDecision) * left ** 2.45 + speed * (edgeDecision - progress);
    }
    const t = (progress - edgeDecision) / (1 - edgeDecision);
    return angle * (1 - smooth(t)) - speed * (1 - edgeDecision) * t * (1 - t) ** 2;
  }

  function tiltAt(corner, progress, bodyPose) {
    if (!corner) return { tip: 0, shift: 0 };
    const { angle, x, y, sign, forward } = corner;
    const tip = sign * tipAngle(progress, angle, forward) * bodyPose;
    // Counter the corner's local displacement to roll around the contact point.
    const shift = x * (1 - Math.cos(tip)) + y * Math.sin(tip);
    return { tip, shift };
  }

  function throwPosition(time, index, origin, landing, width, height) {
    const route = throws[index];
    const [center, ground] = landing;
    const age = time - index * stagger;
    const releaseX = width * route.start;
    const releaseFloor = height * (.77 + (index % 2 ? .035 : -.005));
    if (age < release) {
      const gather = smooth(clamp(time / (release + index * stagger)));
      return [mix(origin[0], releaseX, gather), mix(origin[1], releaseFloor, gather)];
    }
    const t = clamp((age - release) / (lastLanding - release));
    const carry = 1 - (1 - t) ** route.speed;
    const scatter = Math.sin(t * Math.PI) ** 2;
    const side = clamp(route.side, .10 - center / width, .91 - center / width);
    const depth = route.depth * clamp((ground / height - .39) / .28);
    return [mix(releaseX, center, carry) + scatter * side * width,
            mix(releaseFloor, ground, carry) + scatter * depth * height];
  }

  function timeline(time, index, flat, reduced, corner) {
    const age = Math.max(0, time - index * stagger);
    const direction = index === 0 ? -1 : 1;
    const progress = edgeProgress(age, reduced);
    const edgeFinish = smooth(clamp((progress - .74) / .26));
    if (reduced) {
      const t = clamp(age / (corner ? shortEdgeStart : shortRollTime));
      const pose = smooth(t);
      const { tip, shift } = tiltAt(corner, progress, pose);
      const swing = Math.sin(t * Math.PI) * .24;
      return { lift: Math.sin(t * Math.PI) * .16, travel: shift, spin: swing * direction, tip,
               rock: 0, squash: 1, pose, finish: corner ? edgeFinish : pose,
               faceSteps: corner?.forward && progress < edgeDecision ? 1 : 0, launched: t > 0, impactStrength: 0 };
    }
    if (age < release) {
      const load = age / release;
      return { lift: 0, travel: 0, spin: -direction * load * .18,
               tip: 0, rock: 0, squash: 1 - .12 * Math.sin(load * Math.PI), pose: 0, finish: 1,
               faceSteps: 0, launched: false, impactStrength: 0 };
    }

    const bodyEnd = corner ? edgeStart + 120 : rollTime;
    const t = clamp((age - release) / (bodyEnd - release));
    const turns = (flat ? 4 : 5) - (corner ? 1 : 0);
    const remaining = turns * (1 - t) ** 2.75;
    const spin = direction * ((turns - remaining) * TAU - .18 * (1 - t) ** 4);
    const { lift, impactAge, impactStrength } = flightAt(age);
    const impactKick = impactAge < 88 ? Math.sin(Math.PI * impactAge / 88) * impactStrength : 0;
    const settling = clamp((age - lastLanding) / (bodyEnd - lastLanding));
    const cant = Math.sin(t * TAU * (2.2 + .26 * index)) * (1 - t) ** 1.9;
    const rock = direction * (.18 * impactKick + .88 * cant + (corner ? 0 : .34 * Math.sin(settling * TAU * 2) * (1 - settling) ** 2.5));
    const pose = 1 - (1 - t) ** 2.4;
    const { tip, shift } = tiltAt(corner, progress, pose);
    const tumbles = remaining * 3;
    const faceSteps = Math.round(tumbles) + (corner?.forward && progress < edgeDecision ? 1 : 0);
    const heat = (1 - t) ** 1.35;
    const faceWidth = 1 - (1 - Math.abs(Math.cos(Math.PI * tumbles))) * Math.min(.92, heat * 1.65);
    return { lift, travel: shift, spin, tip, rock, heat, faceWidth, squash: 1 - .18 * impactKick,
             pose, finish: corner ? edgeFinish : smooth(clamp((t - .82) / .18)),
             faceSteps, launched: true, impactAge, impactStrength };
  }

  function floorShadow(ctx, x, y, radius, lift, flat) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, flat ? .34 : .32);
    const spread = radius * (1 + lift * .32);
    const shade = ctx.createRadialGradient(0, 0, spread * .12, 0, 0, spread);
    shade.addColorStop(0, flat ? `rgba(9,3,21,${.68 - lift * .27})` : `rgba(0,5,8,${.83 - lift * .34})`);
    shade.addColorStop(1, 'transparent');
    ellipse(ctx, 0, 0, spread, spread, shade);
    ctx.restore();
  }

  function effects(ctx, x, floor, radius, motion, flat, index) {
    if (!motion.impactStrength || motion.impactAge >= 180) return;
    const progress = motion.impactAge / 180;
    ctx.save();
    if (flat) {
      const puff = radius * (.16 + .16 * progress);
      ctx.globalAlpha = .72 * motion.impactStrength * (1 - progress) ** 1.65;
      ctx.lineWidth = Math.max(1.15, radius * .033);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#4d2d68';
      for (const direction of [-1, 1]) {
        const at = x + direction * radius * (.51 + progress * .63);
        ellipse(ctx, at, floor + radius * .014, puff, puff * .56, '#fff0ff', '#724692');
        ellipse(ctx, at + direction * puff * .76, floor - puff * .55, puff * .47, puff * .42, '#fff5ff', null);
        ctx.beginPath();
        ctx.moveTo(at + direction * puff * .68, floor - puff * .89);
        ctx.lineTo(at + direction * puff * 1.73, floor - puff * 1.60);
        ctx.moveTo(at + direction * puff * 1.16, floor + puff * .12);
        ctx.lineTo(at + direction * puff * 2.12, floor + puff * .29);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }
    ctx.globalAlpha = motion.impactStrength * (1 - progress) ** 2 * .47;
    ctx.lineWidth = 1.1;
    ellipse(ctx, x, floor, radius * (.61 + progress), radius * (.11 + progress * .20), null, colors[index].face);
    for (let spark = 0; spark < 5; spark += 1) {
      const angle = spark * TAU / 5 + index * .43;
      const direction = [Math.cos(angle), Math.sin(angle)];
      const distance = radius * (.57 + progress * (.53 + spark % 3 * .09));
      const tip = [x + direction[0] * distance, floor + direction[1] * distance * .39];
      ctx.strokeStyle = colors[index].light;
      ctx.beginPath();
      ctx.moveTo(...tip);
      ctx.lineTo(tip[0] + 7 * direction[0], tip[1] + 5 * direction[1]);
      ctx.stroke();
    }
    ctx.restore();
  }

  function streaks(ctx, frame, width, height, flat, elapsed) {
    const { die, index, radius, origin, landing, liftScale, x, floor, lift, motion, color, corner } = frame;
    if (!motion.heat || motion.heat < .23) return;
    const y = floor - lift - radius * .71;
    const traces = [72, 47, 24].map(delay => {
      const moment = Math.max(release + index * stagger, elapsed - delay);
      const [pastX, pastFloor] = throwPosition(moment, index, origin, landing, width, height);
      const then = timeline(moment, index, flat, false, corner);
      return [pastX, pastFloor - then.lift * liftScale - radius * .71, then.spin + then.rock * .65];
    });
    if (Math.hypot(x - traces[0][0], y - traces[0][1]) < radius * .085) return;
    ctx.save();
    ctx.lineCap = 'round';
    const strip = ctx.createLinearGradient(traces[0][0], traces[0][1], x, y);
    strip.addColorStop(0, `${color.face}00`);
    strip.addColorStop(.66, `${color.face}4a`);
    strip.addColorStop(1, `${color.light}95`);
    ctx.strokeStyle = strip;
    for (const offset of [-.28, .27]) {
      ctx.globalAlpha = motion.heat * (flat ? .65 : .38);
      ctx.lineWidth = Math.max(1.2, radius * (offset > 0 ? .057 : .033));
      ctx.beginPath();
      ctx.moveTo(traces[0][0], traces[0][1] + radius * offset);
      ctx.quadraticCurveTo(traces[1][0], traces[1][1] + radius * offset, x, y + radius * offset);
      ctx.stroke();
    }
    ctx.strokeStyle = color.face;
    traces.slice(1).forEach(([px, py, angle], i) => {
      ctx.globalAlpha = motion.heat * (i ? .18 : .12) * (flat ? 1 : .59);
      ctx.lineWidth = Math.max(1.1, radius * .031);
      const ghost = profiles[die.sides].map(([a, b]) => [
        px + radius * .83 * (a * Math.cos(angle) - b * Math.sin(angle)),
        py + radius * .83 * (a * Math.sin(angle) + b * Math.cos(angle)),
      ]);
      path(ctx, ghost);
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawFlat(ctx, x, floor, radius, lift, roll, number, color, motion, index, captionOpacity) {
    const angle = flatRestAngle(index) + motion.spin + motion.rock * .65 + motion.tip;
    const width = motion.faceWidth ?? 1;
    const cant = (1 - width) * (index % 2 ? -.20 : .20);
    const face = profiles[roll.sides].map(([px, py]) => [(px * width + py * cant) * radius, py * radius]);
    const depth = radius * .14;
    const depthX = depth * .53 + (1 - width) * radius * (index % 2 ? -.72 : .72);
    const side = face.map(([px, py]) => [px + depthX, py + depth]);
    const squash = 1 - (1 - motion.squash) * 1.43;
    const stretch = 1 / Math.sqrt(squash);
    const sine = Math.sin(angle) * stretch, cosine = Math.cos(angle) * squash;
    const edge = Math.max(...[...face, ...side].map(([px, py]) => px * sine + py * cosine));
    ctx.save();
    ctx.translate(x, floor - lift - edge);
    ctx.rotate(angle);
    ctx.scale(stretch, squash);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2.15, radius * .047);
    ctx.strokeStyle = '#271731';
    path(ctx, side);
    ctx.fillStyle = color.edge;
    ctx.fill();
    ctx.stroke();
    face.forEach((point, i) => {
      const next = (i + 1) % face.length;
      path(ctx, [point, face[next], side[next], side[i]]);
      ctx.fillStyle = i < face.length / 2 ? color.edge : `${color.face}90`;
      ctx.fill();
      ctx.stroke();
    });

    path(ctx, face);
    const fill = ctx.createLinearGradient(-radius, -radius, radius, radius);
    fill.addColorStop(0, color.light);
    fill.addColorStop(.54, color.face);
    fill.addColorStop(1, color.face);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
    ctx.save();
    path(ctx, face);
    ctx.clip();
    ctx.fillStyle = '#ffffff40';
    path(ctx, [[-radius, -radius], [radius * .68, -radius], [-radius * .35, radius * .19], [-radius, radius * .55]]);
    ctx.fill();
    if (width > .46) {
      ctx.fillStyle = `${color.edge}70`;
      ctx.beginPath();
      for (let row = 0; row < 3; row += 1) {
        for (let col = 0; col < 4 - row; col += 1) {
          const px = radius * width * (.33 + col * .13), py = radius * (.47 + row * .13);
          const dot = radius * (.029 + col * .006);
          ctx.moveTo(px + dot, py);
          ctx.arc(px, py, dot, 0, TAU);
        }
      }
      ctx.fill();
    }
    ctx.restore();
    ctx.lineWidth = Math.max(1.15, radius * .033);
    ctx.strokeStyle = '#fff8f3ce';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(face.at(-1)[0] * .9, face.at(-1)[1] * .9);
    ctx.lineTo(face[0][0] * .9, face[0][1] * .9);
    ctx.lineTo(face[1][0] * .9, face[1][1] * .9);
    ctx.stroke();
    ctx.save();
    ctx.scale(width, 1);
    ctx.globalAlpha = clamp((width - .13) * 1.23) * (1 - (motion.heat || 0) * .54);
    ctx.fillStyle = '#1f1a2a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyph = number === null ? '✦' : String(number);
    ctx.font = `850 ${radius * (glyph.length > 1 ? .69 : .98)}px "Arial Rounded MT Bold", "Segoe UI Black", "Segoe UI", sans-serif`;
    ctx.strokeStyle = '#ffe7ffd9';
    ctx.lineWidth = Math.max(1, radius * .064);
    ctx.strokeText(glyph, 0, radius * .055);
    ctx.fillText(glyph, 0, radius * .055);
    ctx.restore();
    if (captionOpacity) {
      ctx.globalAlpha = captionOpacity;
      ctx.font = `650 ${Math.max(9, radius * .18)}px Consolas, monospace`;
      ctx.fillStyle = '#291837';
      ctx.fillText(`D${roll.sides}`, 0, radius * .52);
    }
    ctx.restore();
  }

  function turnAround(axis, angle) {
    return [Math.cos(angle / 2), ...scale(axis, Math.sin(angle / 2))];
  }

  function combine([a, x, y, z], [b, p, q, r]) {
    return [a * b - x * p - y * q - z * r, a * p + x * b + y * r - z * q,
            a * q - x * r + y * b + z * p, a * r + x * q - y * p + z * b];
  }

  function rotate([w, x, y, z], [a, b, c]) {
    const p = 2 * (y * c - z * b), q = 2 * (z * a - x * c), r = 2 * (x * b - y * a);
    return [a + w * p + y * r - z * q, b + w * q + z * p - x * r, c + w * r + x * q - y * p];
  }

  function groundedPose(anchor, supports) {
    // Choose a broad base that brings the outcome face toward the viewer.
    const distance = face => Math.abs(dot(anchor.normal, face.normal) + level[2]);
    const base = supports.reduce((best, face) => distance(face) < distance(best) ? face : best);
    const down = scale(level, -1);
    const alignment = dot(base.normal, down);
    const turnAxis = Math.abs(base.normal[0]) < .9 ? [1, 0, 0] : [0, 1, 0];
    const alignBase = alignment < -.99999 ? turnAround(unit(cross(base.normal, turnAxis)), Math.PI)
      : unit([1 + alignment, ...cross(base.normal, down)]);
    const target = unit(alongTable(rotate(alignBase, anchor.normal)));
    const angle = Math.atan2(dot(level, cross(target, facingCamera)), dot(target, facingCamera));
    return combine(turnAround(level, angle), alignBase);
  }

  function restPose(anchor, idle, direction, sides) {
    const yaw = sides === 4 ? (idle ? .74 : .62) : (idle ? .32 : .12);
    return combine(turnAround(level, direction * yaw), anchor.rest);
  }

  function flatFootprint(sides, index, tilt = 0) {
    const angle = flatRestAngle(index) + tilt;
    const sine = Math.sin(angle), cosine = Math.cos(angle);
    const face = profiles[sides];
    const rim = face.map(([x, y]) => [x + .14 * .53, y + .14]);
    return [...face, ...rim].map(([x, y]) => [
      .94 * (x * cosine - y * sine),
      .94 * (x * sine + y * cosine),
    ]);
  }

  function projectUnit([x, y, z], radius = 1) {
    const perspective = radius / (1 - z * .13);
    return [x * perspective, -y * perspective];
  }

  function tippingCorner(die, index, flat) {
    const direction = index === 0 ? -1 : 1;
    const forward = die.ending === 'forward';
    const sign = forward ? -direction : direction;
    const key = `${flat}:${die.sides}:${flat ? 0 : die.value}:${direction}:${die.ending}`;
    if (tippingCorners.has(key)) return tippingCorners.get(key);

    let points;
    if (flat) {
      points = flatFootprint(die.sides, index);
    } else {
      const model = meshFor(die.sides);
      const pose = restPose(model.scoring[die.value - 1], false, direction, die.sides);
      points = model.vertices.map(vertex => {
        const oriented = rotate(pose, vertex);
        return [oriented[0], -dot(oriented, level)];
      });
    }

    // At the tipping point, the supporting corner is directly below the center.
    const candidates = points.filter(([x, y]) => x * sign > 0 && y > 0)
      .map(([x, y]) => ({ x, y, angle: Math.atan2(x * sign, y) }))
      .sort((a, b) => a.angle - b.angle);
    const corner = candidates.find(({ x, y, angle }) => angle > .14 && points.every(([px, py]) =>
      px * Math.sin(angle * sign) + py * Math.cos(angle) <= Math.hypot(x, y) + .0005));
    const result = corner ? { ...corner, sign, forward } : null;
    tippingCorners.set(key, result);
    return result;
  }

  function landingEnvelope(die, index) {
    const direction = index === 0 ? -1 : 1;
    const key = `${die.sides}:${die.value}:${direction}:${die.ending ?? ''}`;
    if (landingEnvelopes.has(key)) return landingEnvelopes.get(key);
    const model = meshFor(die.sides);
    const pose = restPose(model.scoring[die.value - 1], false, direction, die.sides);
    const rest = { left: Infinity, right: -Infinity, height: 0 };
    const take = (bounds, flat, tip = 0, shift = 0) => {
      const orientation = flat ? null : combine(turnAround(facingCamera, -tip), pose);
      const points = flat ? flatFootprint(die.sides, index, tip)
        : model.vertices.map(vertex => projectUnit(rotate(orientation, vertex)));
      const x = points.map(point => point[0]);
      const y = points.map(point => point[1]);
      bounds.left = Math.min(bounds.left, Math.min(...x) + shift);
      bounds.right = Math.max(bounds.right, Math.max(...x) + shift);
      bounds.height = Math.max(bounds.height, Math.max(...y) - Math.min(...y));
    };
    take(rest, true);
    take(rest, false);
    const sweep = { ...rest };
    if (die.ending) {
      for (const flat of [true, false]) {
        const corner = tippingCorner(die, index, flat);
        for (const phase of [0, .14, .31, edgeDecision, .74, .88]) {
          const {tip, shift} = tiltAt(corner, phase, 1);
          take(sweep, flat, tip, shift);
        }
      }
    }
    const envelope = { rest, sweep };
    landingEnvelopes.set(key, envelope);
    return envelope;
  }

  function blendPose(start, end, t) {
    const direction = start.reduce((sum, value, index) => sum + value * end[index], 0) < 0 ? -1 : 1;
    return unit(start.map((value, index) => mix(value, direction * end[index], t)));
  }

  const keyLight = unit([-.55, .6, .85]);
  const rimLight = unit([.75, -.17, .61]);
  const reflection = unit([-.37, .46, .91]);
  const spinAxes = [unit([.71, -.58, .31]), unit([.49, .77, .41]), unit([-.65, .59, .48]), unit([.35, -.56, .75])];

  function lacquerFace(ctx, x, y, radius, lacquer, light, rim) {
    const gradient = ctx.createLinearGradient(x - radius * .54, y - radius * .80, x + radius * .61, y + radius * .84);
    const exposure = .43 + .53 * light + .18 * rim;
    const reflected = [217, 229, 230];
    const tint = (strength, sheen = 0) => `rgb(${lacquer.map((channel, i) =>
      Math.round(clamp(mix(8 + channel * exposure * strength, reflected[i], sheen), 0, 255))).join(',')})`;
    gradient.addColorStop(0, tint(1.20, .16));
    gradient.addColorStop(.31, tint(1.02, .063));
    gradient.addColorStop(.71, tint(.67));
    gradient.addColorStop(1, tint(.42, .025 * rim));
    return gradient;
  }

  function drawSolid(ctx, x, floor, radius, lift, roll, previous, color, motion, index, isRolling) {
    const model = meshFor(roll.sides);
    const anchor = model.scoring[(roll.value ?? 1) - 1];
    const direction = index ? 1 : -1;
    const end = restPose(anchor, roll.value === null, direction, roll.sides);
    const initial = model.scoring[(previous?.value ?? 1) - 1] || model.scoring[0];
    const blend = isRolling ? blendPose(restPose(initial, previous?.value == null, direction, roll.sides), end, motion.pose) : end;
    const tumbling = combine(turnAround(spinAxes[index], motion.spin), blend);
    const supportTilt = turnAround(facingCamera, -motion.tip);
    const orientation = combine(supportTilt, combine(turnAround([1, 0, 0], motion.rock), tumbling));
    const transform = point => rotate(orientation, point);
    const relative = point => projectUnit(point, radius);
    const silhouette = model.vertices.map(vertex => relative(transform(vertex)));
    const y = floor - lift - Math.max(...silhouette.map(point => point[1]));
    const project = point => {
      const [px, py] = relative(point);
      return [x + px, y + py];
    };
    const vertices = silhouette.map(([px, py]) => [x + px, y + py]);
    const beforeThrow = isRolling && !motion.launched;
    const focus = beforeThrow ? initial : anchor;
    const focusValue = beforeThrow ? previous?.value : roll.value;
    const visible = model.faces.map(face => ({ face, normal: transform(face.normal), center: transform(face.center) }))
      .filter(({ normal, center }) => dot(normal, [-center[0] * .13, -center[1] * .13, 1 - center[2] * .13]) > 0)
      .sort((a, b) => a.center[2] - b.center[2]);

    // One studio light spans the faces of the whole die.
    const softbox = new Path2D();
    softbox.moveTo(x - radius * .94, y - radius * .79);
    softbox.lineTo(x + radius * .13, y - radius * .91);
    softbox.quadraticCurveTo(x + radius * .50, y - radius * .80, x + radius * .49, y - radius * .50);
    softbox.quadraticCurveTo(x - radius * .06, y - radius * .32, x - radius * .88, y - radius * .36);
    softbox.closePath();
    const sheen = ctx.createLinearGradient(x - radius * .43, y - radius * .92, x - radius * .21, y - radius * .26);
    sheen.addColorStop(0, '#fff9f1');
    sheen.addColorStop(.35, '#f7fffce9');
    sheen.addColorStop(.70, '#e1f4ef9c');
    sheen.addColorStop(1, '#c9e4e100');

    ctx.lineJoin = 'round';
    for (const {face, normal, center} of visible) {
      const polygon = face.indices.map(vertex => vertices[vertex]);
      const light = Math.max(0, dot(normal, keyLight));
      const rim = Math.max(0, dot(normal, rimLight));
      path(ctx, polygon);
      ctx.fillStyle = lacquerFace(ctx, x, y, radius, color.lacquer, light, rim);
      ctx.fill();
      ctx.strokeStyle = `rgba(232,243,244,${.075 + light * .17})`;
      ctx.lineWidth = Math.max(.8, radius * .014);
      ctx.stroke();

      const gloss = clamp((dot(normal, reflection) - .23) / .77) ** 1.85;
      if (gloss > .055) {
        ctx.save();
        ctx.clip();
        ctx.globalAlpha = gloss * .84;
        ctx.fillStyle = sheen;
        ctx.fill(softbox);
        ctx.restore();
      }

      if (face === focus && motion.finish) {
        const midpoint = project(center);
        path(ctx, polygon.map(point => point.map((coordinate, axis) => mix(midpoint[axis], coordinate, .89))));
        ctx.strokeStyle = `rgba(240,247,249,${.22 * motion.finish})`;
        ctx.lineWidth = .8;
        ctx.stroke();
      }

      if (normal[2] < .22) continue;
      const pixel = project(center);
      const step = .02;
      const xAxis = project(transform(face.center.map((c, i) => c + face.horizontal[i] * step)));
      const yAxis = project(transform(face.center.map((c, i) => c - face.vertical[i] * step)));
      const reference = radius * step;
      ctx.save();
      ctx.transform((xAxis[0] - pixel[0]) / reference, (xAxis[1] - pixel[1]) / reference,
                    (yAxis[0] - pixel[0]) / reference, (yAxis[1] - pixel[1]) / reference, ...pixel);
      const focal = face === focus;
      const value = focal && focusValue == null ? `D${roll.sides}` : String(face.score);
      const ink = light * .65 + rim * .25;
      const fontSize = Math.min(radius * .48, radius * face.inradius * (value.length > 1 ? 1.48 : 2.08));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `750 ${fontSize}px Consolas, monospace`;
      const restingInk = focal ? 1 : .12 + normal[2] * .20;
      const movingInk = (.45 + ink * .52) * (1 - (motion.heat || 0) * .71);
      ctx.fillStyle = `rgba(255,251,224,${mix(movingInk, restingInk, motion.finish)})`;
      if (focal && motion.finish) {
        ctx.lineWidth = Math.max(.9, fontSize * .088);
        ctx.strokeStyle = `rgba(14,24,25,${.75 * motion.finish})`;
        ctx.strokeText(value, 0, 1);
      }
      ctx.shadowColor = '#152528';
      ctx.shadowOffsetY = .75;
      ctx.shadowBlur = focal ? .65 + .66 * motion.finish : .60;
      ctx.fillText(value, 0, 1);
      ctx.restore();
    }
  }

  function createStage(canvas) {
    const context = canvas.getContext('2d', { alpha: false });
    const backdrop = document.createElement('canvas');
    const background = backdrop.getContext('2d', { alpha: false });
    const still = { lift: 0, travel: 0, spin: 0, tip: 0, rock: 0, squash: 1, finish: 1, faceSteps: 0, launched: true, impactStrength: 0 };
    let hasBackground = false;
    let dice = [];
    let previous = [];
    let time = null;
    let reduced = false;
    let flat = true;

    function render(nextDice = dice, elapsed = time, prefersReduced = reduced) {
      if (!context) return;
      if (elapsed !== null && time === null) previous = dice;
      dice = nextDice;
      time = elapsed;
      reduced = prefersReduced;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      const ratio = Math.min(2, window.devicePixelRatio || 1);
      const pixelsWide = Math.round(width * ratio), pixelsHigh = Math.round(height * ratio);
      if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
        canvas.width = pixelsWide;
        canvas.height = pixelsHigh;
      }
      if (backdrop.width !== pixelsWide || backdrop.height !== pixelsHigh || !hasBackground) {
        backdrop.width = pixelsWide;
        backdrop.height = pixelsHigh;
        background.setTransform(ratio, 0, 0, ratio, 0, 0);
        surface(background, width, height, flat);
        hasBackground = true;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.drawImage(backdrop, 0, 0, width, height);
      const worlds = dice.map((die, index) => {
        const corner = elapsed !== null && die.ending ? tippingCorner(die, index, flat) : null;
        const motion = elapsed === null ? still : timeline(elapsed, index, flat, reduced, corner);
        const homeRadius = Math.min(width * dieWidths[dice.length - 1], height * .229, 105);
        const landing = [die.spot[0] * width, die.spot[1] * height];
        const oldSpot = previous[index]?.spot ?? die.spot;
        const origin = [oldSpot[0] * width, oldSpot[1] * height];
        const inThrow = elapsed !== null && !reduced;
        const slide = elapsed === null ? 1 : smooth(clamp(elapsed / shortEdgeStart));
        const [pathX, floor] = inThrow ? throwPosition(elapsed, index, origin, landing, width, height)
          : [mix(origin[0], landing[0], slide), mix(origin[1], landing[1], slide)];
        const radius = homeRadius * depthScale(floor / height);
        const x = pathX + radius * motion.travel;
        const liftScale = inThrow ? Math.min(homeRadius * 1.58, height * .25) * throws[index].rise : Math.min(homeRadius * 1.12, height * .215);
        const lift = motion.lift * liftScale;
        return { die, index, corner, motion, color: colors[index], origin, landing, x, floor, lift, liftScale, radius };
      }).sort((a, b) => a.floor - b.floor);

      for (const world of worlds) {
        const { corner, x, floor, radius, index, motion } = world;
        const tilt = Math.abs(motion.tip);
        const nearEdge = corner ? clamp(tilt / corner.angle) * clamp(1 - Math.abs(tilt - corner.angle) / .24) : 0;
        const contact = nearEdge ? corner.x * Math.cos(motion.tip) - corner.y * Math.sin(motion.tip) : 0;
        floorShadow(context, x + radius * mix(.08, contact, nearEdge), floor, radius * (1.03 - .23 * nearEdge), motion.lift, flat);
        effects(context, x, floor, radius, motion, flat, index);
        if (!reduced && elapsed !== null) streaks(context, world, width, height, flat, elapsed);
      }
      for (const {die, index, x, floor, lift, radius, color, motion} of worlds) {
        if (flat) {
          const number = !motion.launched ? previous[index]?.value ?? null
            : die.value === null ? null : (die.value - 1 + motion.faceSteps) % die.sides + 1;
          drawFlat(context, x, floor, radius * .94, lift, die, number, color, motion, index, motion.finish);
        } else {
          drawSolid(context, x, floor, radius, lift, die, previous[index], color, motion, index, elapsed !== null);
        }
      }
    }

    function setFlat(nextFlat) {
      if (nextFlat === flat) return;
      flat = nextFlat;
      hasBackground = false;
      render();
    }

    const observer = new ResizeObserver(() => render());
    observer.observe(canvas);
    return { render, setFlat, dispose: () => observer.disconnect() };
  }

  const duration = (reduced, count) => (reduced ? shortEdgeStart + shortEdgeTime : edgeStart + edgeTime)
    + (count - 1) * stagger;
  return { createStage, duration, placeDice };
})();
