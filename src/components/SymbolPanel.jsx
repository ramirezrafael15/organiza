// Símbolos que ayudan a tomar apuntes: flechas, matemáticas, letras griegas, marcas...
import { useState } from 'react';

const GROUPS = {
  Flechas: '← → ↑ ↓ ↔ ↕ ↖ ↗ ↘ ↙ ⇐ ⇒ ⇑ ⇓ ⇔ ⇕ ⟵ ⟶ ⟷ ➔ ➜ ➤ ↦ ↩ ↪ ↺ ↻ ↳ ↰ ⤴ ⤵ ⇄ ⇆ ⇢ ⇠',
  Marcas: '✔ ✘ ✓ ✗ ☑ ☐ ★ ☆ ⚠ ❗ ❓ ✎ ● ○ ■ □ ▲ ▼ ◆ ◇ • ‣ – — · § ¶ © ® ™ † ‡ ※',
  'Mates': '± × ÷ ≠ ≈ ≡ ≤ ≥ ≪ ≫ ∞ √ ∑ ∏ ∫ ∂ ∆ ∇ % ‰ ° ² ³ ⁿ ½ ⅓ ¼ ¾ ∈ ∉ ⊂ ⊆ ∪ ∩ ∅ ∴ ∵ ¬ ∧ ∨ ∀ ∃',
  Griegas: 'α β γ δ ε ζ η θ λ μ π ρ σ τ φ χ ψ ω Γ Δ Θ Λ Σ Φ Ψ Ω',
  Dinero: '€ $ £ ¥ ¢ ₿ % ‰ ± ≈',
  Emojis: '📌 💡 📖 📝 ⏰ 🎯 🔑 ⚡ 🔥 ✅ ❌ ⭐ 📊 📈 📉 🧠 ❗ ❓ 👉 👈 ⬆️ ⬇️ ➡️ ⬅️',
};

export default function SymbolPanel({ onPick, onClose }) {
  const [tab, setTab] = useState('Flechas');
  return (
    <div className="sym-panel">
      <div className="sym-head">
        <div className="chips">
          {Object.keys(GROUPS).map((g) => (
            <button key={g} type="button" className={`chip-btn ${tab === g ? 'on' : ''}`} onMouseDown={(e) => e.preventDefault()} onClick={() => setTab(g)}>{g}</button>
          ))}
        </div>
        <button type="button" className="btn small" onMouseDown={(e) => e.preventDefault()} onClick={onClose}>Cerrar</button>
      </div>
      <div className="sym-grid">
        {GROUPS[tab].split(' ').map((s, i) => (
          <button key={`${s}${i}`} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(s)}>{s}</button>
        ))}
      </div>
      <p className="small muted" style={{ margin: 0 }}>Truco: escribiendo <b>{'->'}</b> o <b>{'<-'}</b> se convierte solo en → o ←.</p>
    </div>
  );
}
