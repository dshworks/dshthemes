// Springs as CSS. Motion's {stiffness, damping, mass} springs, sampled into a
// linear() easing so the site can move like Amicro without shipping a runtime.
// Returns { easing, duration } for a 0 -> 1 spring from rest.

export function spring({ stiffness = 100, damping = 10, mass = 1, restDelta = 0.01, restSpeed = 0.06, steps = 48 } = {}) {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  let x;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    x = (t) => 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  } else if (zeta === 1) {
    x = (t) => 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  } else {
    const s1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
    const s2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
    x = (t) => 1 - (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s2 - s1);
  }
  // find rest: position within restDelta and speed within restSpeed, held for 3 samples
  let dur = 0.05;
  const dt = 1 / 120;
  let held = 0;
  for (let t = dt; t < 5; t += dt) {
    const v = (x(t + dt) - x(t)) / dt;
    if (Math.abs(1 - x(t)) < restDelta && Math.abs(v) < restSpeed) {
      if (++held >= 3) { dur = t; break; }
    } else held = 0;
  }
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * dur;
    pts.push(Number(x(t).toFixed(4)));
  }
  pts[pts.length - 1] = 1;
  return { easing: `linear(${pts.join(", ")})`, duration: Math.round(dur * 1000) };
}

// The three springs the site uses, named for what they do, not their numbers.
export const SPRINGS = {
  // icon swaps, chips, buttons: Amicro's stiffness 600 / damping 25
  snap: spring({ stiffness: 600, damping: 25 }),
  // rotations, layout moves: 400 / 25
  soft: spring({ stiffness: 400, damping: 25 }),
  // the deck fanning open: 180 / 20 / mass .8
  fan: spring({ stiffness: 180, damping: 20, mass: 0.8 }),
};

export function springCss() {
  return Object.entries(SPRINGS)
    .map(([k, v]) => `  --spring-${k}: ${v.easing};\n  --spring-${k}-dur: ${v.duration}ms;`)
    .join("\n");
}
