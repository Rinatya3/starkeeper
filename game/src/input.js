// Keyboard and mouse state, sampled once per frame. Keys are tracked by
// code (KeyW, ArrowLeft, Space, ...); the mouse position is converted into
// game coordinates so the canvas can scale without breaking aim.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 640, y: 300, down: false, clicked: false, moved: false };
    this._bind();
  }

  _bind() {
    const canvas = this.canvas;
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.down = false;
    });

    const toGame = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((clientX - rect.left) / rect.width) * canvas.width,
        y: ((clientY - rect.top) / rect.height) * canvas.height,
      };
    };
    canvas.addEventListener('mousemove', (event) => {
      const p = toGame(event.clientX, event.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      this.mouse.moved = true;
    });
    canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
        this.mouse.down = true;
        this.mouse.clicked = true;
      }
      if (event.button === 2) this.pressed.add('DashMouse');
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouse.down = false;
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    // Minimal touch fallback: a finger aims and fires like a mouse.
    canvas.addEventListener('touchstart', (event) => {
      const t = event.changedTouches[0];
      const p = toGame(t.clientX, t.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      this.mouse.down = true;
      this.mouse.clicked = true;
      this.mouse.moved = true;
      event.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', (event) => {
      const t = event.changedTouches[0];
      const p = toGame(t.clientX, t.clientY);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      event.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchend', () => {
      this.mouse.down = false;
    });
  }

  down(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  // Movement axis from WASD or arrows, normalized.
  axis() {
    let x = 0;
    let y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2;
      y *= Math.SQRT1_2;
    }
    return { x, y };
  }

  firing() {
    return this.mouse.down || this.down('Space');
  }

  // Called at the end of each frame: edges live for exactly one frame.
  endFrame() {
    this.pressed.clear();
    this.mouse.clicked = false;
  }
}
