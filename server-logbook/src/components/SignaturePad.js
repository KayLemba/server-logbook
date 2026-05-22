import React, { useRef, useEffect } from 'react';
import { useSignaturePad } from '../hooks';
import { IcoPenLine, IcoX, IcoCheck } from './Icons';

export default function SignaturePad({ onSave, existingSignature, onClear }) {
  const canvasRef = useRef(null);
  const { startDraw, draw, stopDraw, clear, getDataURL, isEmpty } = useSignaturePad(canvasRef);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width  = (rect.width  || 600) * dpr;
    canvas.height = (rect.height || 120) * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }, []);

  const handleSave = () => {
    const dataURL = getDataURL();
    if (dataURL) onSave(dataURL);
  };

  const handleClear = () => {
    clear();
    if (onClear) onClear();
  };

  if (existingSignature) {
    return (
      <div>
        <img
          src={existingSignature}
          alt="Captured signature"
          style={{
            width: '100%', height: '120px', objectFit: 'contain',
            border: '1.5px solid var(--border)', borderRadius: 'var(--radius-md)',
            background: '#ffffff', padding: '10px', display: 'block',
          }}
        />
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClear}>
            <IcoX size={12} /> Re-sign
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="signature-pad-wrapper">
      <canvas
        ref={canvasRef}
        style={{ height: '120px', background: 'transparent' }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
      <div className="signature-controls">
        <span className="sig-hint">
          <IcoPenLine size={12} />
          Draw signature using mouse or touchpad
        </span>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleClear}>
            <IcoX size={12} /> Clear
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={isEmpty}
          >
            <IcoCheck size={12} /> Save Signature
          </button>
        </div>
      </div>
    </div>
  );
}
