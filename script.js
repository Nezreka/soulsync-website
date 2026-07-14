// ===== Scroll Reveal =====
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
});


// ===== GitHub Star Count =====
fetch('https://api.github.com/repos/Nezreka/SoulSync')
    .then(r => r.json())
    .then(data => {
        if (data.stargazers_count !== undefined) {
            const el = document.getElementById('star-count');
            if (el) {
                el.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ${data.stargazers_count}`;
            }
        }
    })
    .catch(() => {});


// ===== Hero Particle Field =====
function initHeroParticles() {
    const canvas = document.getElementById('hero-particles');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let w, h, particles = [];
    const COUNT = 80;

    function resize() {
        const dpr = window.devicePixelRatio || 1;
        w = canvas.parentElement.offsetWidth;
        h = canvas.parentElement.offsetHeight;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn() {
        particles = [];
        for (let i = 0; i < COUNT; i++) {
            particles.push({
                x: Math.random() * w,
                y: Math.random() * h,
                vx: (Math.random() - 0.5) * 0.3,
                vy: (Math.random() - 0.5) * 0.3,
                r: Math.random() * 1.5 + 0.3,
                a: Math.random() * 0.3 + 0.05
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${p.a})`;
            ctx.fill();
        });

        // Draw faint connections for nearby particles (skip on small screens)
        if (w > 600) {
            const maxCheck = Math.min(particles.length, 40);
            for (let i = 0; i < maxCheck; i++) {
                for (let j = i + 1; j < maxCheck; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.strokeStyle = `rgba(255,255,255,${0.04 * (1 - dist / 120)})`;
                        ctx.lineWidth = 0.5;
                        ctx.stroke();
                    }
                }
            }
        }

        requestAnimationFrame(draw);
    }

    resize();
    spawn();
    draw();
    window.addEventListener('resize', () => { resize(); spawn(); });
}

document.addEventListener('DOMContentLoaded', initHeroParticles);


// ===== Modal handling =====
const modalLinks = document.querySelectorAll('[data-modal]');
const modalOverlays = document.querySelectorAll('.modal-overlay');
const modalCloseButtons = document.querySelectorAll('.modal-close');

modalLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const modal = document.getElementById(`modal-${link.dataset.modal}`);
        if (modal) { modal.classList.add('active'); document.body.style.overflow = 'hidden'; }
    });
});
modalCloseButtons.forEach(btn => {
    btn.addEventListener('click', () => { btn.closest('.modal-overlay').classList.remove('active'); document.body.style.overflow = ''; });
});
modalOverlays.forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.classList.remove('active'); document.body.style.overflow = ''; } });
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { modalOverlays.forEach(o => o.classList.remove('active')); document.body.style.overflow = ''; }
});


// ===== Utility =====
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return { r: parseInt(hex.substr(0,2),16), g: parseInt(hex.substr(2,2),16), b: parseInt(hex.substr(4,2),16) };
}

function setupCanvas(canvas) {
    const parent = canvas.parentElement;
    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: rect.width, h: rect.height };
}


// ===== Line Hover — Magnetic Repulsion =====
// Each line has a single midpoint that bows away from the cursor.
// Simple lerp back to rest — no physics, no jitter.

const LINE_HOVER_RADIUS = 80;  // how close mouse needs to be
const LINE_MAX_BEND = 14;      // max pixels the line bows
const LINE_EASE_SPEED = 0.08;  // how fast it returns to straight (0-1)

function createLineState() {
    return { bend: 0, targetBend: 0, glow: 0 };
}

function updateLineState(state, mx, my, x1, y1, x2, y2) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) { state.targetBend = 0; return; }

    // Perpendicular normal
    const nx = -dy / len, ny = dx / len;

    // Distance from mouse to line midpoint
    const distX = mx - midX, distY = my - midY;
    const dist = Math.sqrt(distX * distX + distY * distY);

    if (dist < LINE_HOVER_RADIUS && mx > -999) {
        // Which side of the line is the mouse on?
        const side = distX * nx + distY * ny;
        // Push away from mouse — closer = stronger
        const strength = (1 - dist / LINE_HOVER_RADIUS);
        state.targetBend = (side > 0 ? -1 : 1) * strength * LINE_MAX_BEND;
        state.glow = Math.min(0.3, state.glow + 0.02);
    } else {
        state.targetBend = 0;
    }

    // Smooth lerp toward target
    state.bend += (state.targetBend - state.bend) * LINE_EASE_SPEED;
    state.glow *= 0.95;

    // Snap to zero when close enough
    if (Math.abs(state.bend) < 0.1 && state.targetBend === 0) state.bend = 0;
}

function drawHoverLine(ctx, x1, y1, x2, y2, state, color, baseAlpha) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;

    const nx = -dy / len, ny = dx / len;
    const midX = (x1 + x2) / 2 + nx * state.bend;
    const midY = (y1 + y2) / 2 + ny * state.bend;
    const rgb = hexToRgb(color);

    const alpha = baseAlpha + state.glow * 0.12;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(midX, midY, x2, y2);
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
    ctx.lineWidth = 1 + state.glow;
    ctx.stroke();

    // Subtle color glow when bent
    if (Math.abs(state.bend) > 0.5) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(midX, midY, x2, y2);
        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${Math.abs(state.bend) / LINE_MAX_BEND * 0.06})`;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

// Track mouse position relative to an element
function trackMouse(element) {
    const state = { x: -9999, y: -9999 };
    element.addEventListener('mousemove', (e) => {
        const rect = element.getBoundingClientRect();
        state.x = e.clientX - rect.left;
        state.y = e.clientY - rect.top;
    });
    element.addEventListener('mouseleave', () => {
        state.x = -9999;
        state.y = -9999;
    });
    return state;
}


// ==========================================================
//  SECTION 1: ORBITAL — Metadata Enrichment
//  Revolving circle with data particles flowing inward
// ==========================================================
function initOrbital() {
    const orbital = document.getElementById('orbit-metadata');
    const canvas = document.getElementById('canvas-metadata');
    if (!orbital || !canvas) return;

    const ring = orbital.querySelector('.orbit-ring');
    const nodes = ring.querySelectorAll('.service-node');
    let particles = [];
    let running = false;
    let C;

    const lineStates = [];
    nodes.forEach(() => lineStates.push(createLineState()));
    const mouse = trackMouse(canvas.parentElement);

    function layout() {
        C = setupCanvas(canvas);
        const radius = C.w * 0.4;
        nodes.forEach(node => {
            const a = parseFloat(node.dataset.angle) * (Math.PI / 180);
            node.style.marginLeft = `${Math.cos(a) * radius}px`;
            node.style.marginTop = `${Math.sin(a) * radius}px`;
        });
        const speed = orbital.dataset.speed || 90;
        ring.style.animationDuration = `${speed}s`;
        nodes.forEach(n => n.style.animationDuration = `${speed}s`);
    }

    function spawnParticle() {
        const arr = Array.from(nodes);
        const node = arr[Math.floor(Math.random() * arr.length)];
        const wrap = canvas.parentElement;
        const wr = wrap.getBoundingClientRect();
        const nr = node.querySelector('.node-icon').getBoundingClientRect();
        const color = node.dataset.color;
        particles.push({
            x: nr.left + nr.width/2 - wr.left,
            y: nr.top + nr.height/2 - wr.top,
            sx: nr.left + nr.width/2 - wr.left,
            sy: nr.top + nr.height/2 - wr.top,
            tx: C.w/2, ty: C.h/2,
            color, progress: 0,
            speed: 0.006 + Math.random() * 0.01,
            size: 1.5 + Math.random() * 2,
            trail: []
        });
    }

    function animate() {
        if (!running) return;
        C.ctx.clearRect(0, 0, C.w, C.h);

        // Connection lines with pluck physics
        const wr = canvas.parentElement.getBoundingClientRect();
        nodes.forEach((node, idx) => {
            const nr = node.querySelector('.node-icon').getBoundingClientRect();
            const nx = nr.left + nr.width/2 - wr.left;
            const ny = nr.top + nr.height/2 - wr.top;

            updateLineState(lineStates[idx], mouse.x, mouse.y, nx, ny, C.w/2, C.h/2);
            drawHoverLine(C.ctx, nx, ny, C.w/2, C.h/2, lineStates[idx], node.dataset.color, 0.08);
        });

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.progress += p.speed;
            const e = p.progress * p.progress;
            p.x = p.sx + (p.tx - p.sx) * e;
            p.y = p.sy + (p.ty - p.sy) * e;
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 10) p.trail.shift();
            if (p.progress >= 1) { particles.splice(i, 1); continue; }

            const rgb = hexToRgb(p.color);
            p.trail.forEach((t, idx) => {
                const a = (idx / p.trail.length) * 0.35;
                C.ctx.beginPath();
                C.ctx.arc(t.x, t.y, p.size * 0.5, 0, Math.PI * 2);
                C.ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
                C.ctx.fill();
            });
            C.ctx.beginPath();
            C.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            C.ctx.fillStyle = p.color;
            C.ctx.shadowColor = p.color;
            C.ctx.shadowBlur = 10;
            C.ctx.fill();
            C.ctx.shadowBlur = 0;
        }

        // Center glow
        if (particles.length > 0) {
            const g = C.ctx.createRadialGradient(C.w/2, C.h/2, 0, C.w/2, C.h/2, 45);
            g.addColorStop(0, 'rgba(255,255,255,0.05)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            C.ctx.beginPath();
            C.ctx.arc(C.w/2, C.h/2, 45, 0, Math.PI * 2);
            C.ctx.fillStyle = g;
            C.ctx.fill();
        }

        requestAnimationFrame(animate);
    }

    layout();
    window.addEventListener('resize', layout);

    let spawnInterval;
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !running) {
                running = true;
                spawnInterval = setInterval(spawnParticle, 150);
                animate();
            } else if (!entry.isIntersecting && running) {
                running = false;
                clearInterval(spawnInterval);
            }
        });
    }, { threshold: 0.15 });
    observer.observe(canvas.parentElement);

    particleResetCallbacks.push(() => { particles.length = 0; });
}


// ==========================================================
//  SECTION 2: PIPELINE — Downloads left, SoulSync center, Servers right
//  Particles flow left→center (downloads) and center→right (servers)
// ==========================================================
function initPipeline(canvasId) {
    const canvas = document.getElementById(canvasId || 'canvas-pipeline');
    if (!canvas) return;

    const wrap = canvas.parentElement;
    const allNodes = wrap.querySelectorAll('.pipeline-node');
    const centerEl = wrap.querySelector('.pipeline-center');
    let particles = [];
    let running = false;
    let C;

    const pipeLines = [];
    allNodes.forEach(() => pipeLines.push(createLineState()));
    const pipeMouse = trackMouse(wrap);

    function layout() { C = setupCanvas(canvas); }

    function getCenter() {
        const wr = wrap.getBoundingClientRect();
        const cr = centerEl.getBoundingClientRect();
        return { x: cr.left + cr.width/2 - wr.left, y: cr.top + cr.height/2 - wr.top };
    }

    function getNodePos(node) {
        const wr = wrap.getBoundingClientRect();
        const nr = node.querySelector('.pipeline-node-icon').getBoundingClientRect();
        return { x: nr.left + nr.width/2 - wr.left, y: nr.top + nr.height/2 - wr.top };
    }

    function spawnParticle() {
        const center = getCenter();
        const arr = Array.from(allNodes);
        const node = arr[Math.floor(Math.random() * arr.length)];
        const pos = getNodePos(node);
        const color = node.dataset.color;
        const side = node.dataset.side;

        // Downloads flow toward center, servers flow away from center
        const sx = side === 'left' ? pos.x : center.x;
        const sy = side === 'left' ? pos.y : center.y;
        const tx = side === 'left' ? center.x : pos.x;
        const ty = side === 'left' ? center.y : pos.y;

        particles.push({
            x: sx, y: sy, sx, sy, tx, ty,
            color, progress: 0,
            speed: 0.007 + Math.random() * 0.008,
            size: 1.5 + Math.random() * 2,
            trail: []
        });
    }

    function animate() {
        if (!running) return;
        C.ctx.clearRect(0, 0, C.w, C.h);

        const center = getCenter();

        // Draw connection lines with hover effect
        allNodes.forEach((node, idx) => {
            const pos = getNodePos(node);
            updateLineState(pipeLines[idx], pipeMouse.x, pipeMouse.y, pos.x, pos.y, center.x, center.y);
            drawHoverLine(C.ctx, pos.x, pos.y, center.x, center.y, pipeLines[idx], node.dataset.color, 0.08);
        });

        // Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.progress += p.speed;
            const e = p.progress * p.progress; // ease-in
            p.x = p.sx + (p.tx - p.sx) * e;
            p.y = p.sy + (p.ty - p.sy) * e;
            p.trail.push({ x: p.x, y: p.y });
            if (p.trail.length > 8) p.trail.shift();
            if (p.progress >= 1) { particles.splice(i, 1); continue; }

            const rgb = hexToRgb(p.color);
            p.trail.forEach((pt, idx) => {
                const a = (idx / p.trail.length) * 0.3;
                C.ctx.beginPath();
                C.ctx.arc(pt.x, pt.y, p.size * 0.5, 0, Math.PI * 2);
                C.ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${a})`;
                C.ctx.fill();
            });
            C.ctx.beginPath();
            C.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            C.ctx.fillStyle = p.color;
            C.ctx.shadowColor = p.color;
            C.ctx.shadowBlur = 10;
            C.ctx.fill();
            C.ctx.shadowBlur = 0;
        }

        // Center glow
        const g = C.ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, 50);
        g.addColorStop(0, 'rgba(255,255,255,0.04)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        C.ctx.beginPath();
        C.ctx.arc(center.x, center.y, 50, 0, Math.PI * 2);
        C.ctx.fillStyle = g;
        C.ctx.fill();

        requestAnimationFrame(animate);
    }

    layout();
    window.addEventListener('resize', layout);

    let spawnInterval;
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !running) {
                running = true;
                spawnInterval = setInterval(spawnParticle, 250);
                animate();
            } else if (!entry.isIntersecting && running) {
                running = false;
                clearInterval(spawnInterval);
            }
        });
    }, { threshold: 0.15 });
    observer.observe(wrap);

    particleResetCallbacks.push(() => { particles.length = 0; });
}


// ===== Particle cleanup on tab switch =====
// setInterval keeps firing in background but rAF pauses,
// so particles pile up. Clear them when tab comes back.
const particleResetCallbacks = [];
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        particleResetCallbacks.forEach(fn => fn());
    }
});

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
    initOrbital();
    initPipeline('canvas-pipeline');
    initPipeline('canvas-video-pipeline');
});
