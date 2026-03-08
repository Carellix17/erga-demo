import confetti from "canvas-confetti";

export function fireCelebration() {
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: ["#6C5CE7", "#E84393", "#00B894", "#FDCB6E"],
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: ["#6C5CE7", "#E84393", "#00B894", "#FDCB6E"],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}

export function fireStarBurst() {
  confetti({
    particleCount: 80,
    spread: 100,
    origin: { x: 0.5, y: 0.5 },
    colors: ["#6C5CE7", "#E84393", "#00B894", "#FDCB6E", "#A29BFE"],
    ticks: 200,
    gravity: 0.8,
    scalar: 1.2,
    shapes: ["star", "circle"],
  });
}
