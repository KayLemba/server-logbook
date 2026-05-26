import { useState, useEffect, useCallback, useRef } from 'react';

// ── Theme Hook ─────────────────────────────────────────────────
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('logbook-theme') || 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('logbook-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return { theme, toggleTheme };
}

// ── Live Clock Hook ────────────────────────────────────────────
export function useLiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

// ── Toast Hook ─────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

// ── Signature Pad Hook (smooth bezier curve rendering) ─────────
export function useSignaturePad(canvasRef) {
  const isDrawing  = useRef(false);
  const points     = useRef([]);       // buffer of {x, y, t} points
  const lastPos    = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);

  // Get canvas-space position from mouse or touch event
  const getPos = (e, canvas) => {
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    const src    = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY,
      t: Date.now(),
    };
  };

  // Calculate line width based on speed (fast = thin, slow = thick)
  const getWidth = (p1, p2) => {
    if (!p1) return 2.5;
    const dx   = p2.x - p1.x;
    const dy   = p2.y - p1.y;
    const dt   = Math.max(p2.t - p1.t, 1);
    const speed = Math.sqrt(dx * dx + dy * dy) / dt;
    // Map speed 0–3 to width 3.5–1.2
    const width = Math.max(1.2, 3.5 - speed * 0.7);
    return width;
  };

  const startDraw = useCallback((e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    isDrawing.current = true;
    lastPos.current   = pos;
    points.current    = [pos];

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, [canvasRef]);

  const draw = useCallback((e) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const pos = getPos(e, canvas);
    const buf = points.current;

    buf.push(pos);
    // Keep last 4 points for curve smoothing
    if (buf.length > 4) buf.shift();

    ctx.lineWidth   = getWidth(lastPos.current, pos);
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = '#0c1220';

    if (buf.length >= 3) {
      // Catmull-Rom to bezier: smooth curve through points
      const p0 = buf[buf.length - 3];
      const p1 = buf[buf.length - 2];
      const p2 = buf[buf.length - 1];

      // Control points
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p2.x - p0.x) / 6;
      const cp2y = p2.y - (p2.y - p0.y) / 6;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
      ctx.stroke();
    } else {
      // Fallback for first 2 points
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    lastPos.current = pos;
    setIsEmpty(false);
  }, [canvasRef]);

  const stopDraw = useCallback(() => {
    isDrawing.current = false;
    points.current    = [];
    lastPos.current   = null;
  }, []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    points.current  = [];
    lastPos.current = null;
  }, [canvasRef]);

  const getDataURL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return null;
    return canvas.toDataURL('image/png');
  }, [canvasRef, isEmpty]);

  return { startDraw, draw, stopDraw, clear, getDataURL, isEmpty };
}