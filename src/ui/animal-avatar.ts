// Animal avatar system for Zoon — 动物园主题协作头像
// 人类用户 → 👤，AI Agent → 随机动物（按 ID 哈希，同一 Agent 每次相同）

const ANIMALS: ReadonlyArray<{ readonly emoji: string; readonly color: string }> = [
  { emoji: '🐼', color: '#4a4a4a' },
  { emoji: '🦊', color: '#e8620a' },
  { emoji: '🐨', color: '#7ea0b4' },
  { emoji: '🐯', color: '#d4870a' },
  { emoji: '🦁', color: '#c08010' },
  { emoji: '🐸', color: '#2a8a3a' },
  { emoji: '🐧', color: '#2c4a7a' },
  { emoji: '🐺', color: '#6a80a0' },
  { emoji: '🦝', color: '#6a6a6a' },
  { emoji: '🦋', color: '#9030c0' },
  { emoji: '🦜', color: '#c03030' },
  { emoji: '🐙', color: '#b050a0' },
  { emoji: '🦄', color: '#9060d0' },
  { emoji: '🐬', color: '#2090c0' },
  { emoji: '🦩', color: '#e06090' },
  { emoji: '🐢', color: '#408040' },
  { emoji: '🦔', color: '#904030' },
  { emoji: '🦦', color: '#704020' },
  { emoji: '🐘', color: '#808090' },
  { emoji: '🦒', color: '#c09020' },
];

// djb2 变种哈希，确保同一 id 始终映射到同一动物
function simpleHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0; // 保持 32-bit 无符号
  }
  return h;
}

export function getAnimalForId(id: string): (typeof ANIMALS)[number] {
  return ANIMALS[simpleHash(id) % ANIMALS.length];
}

// 带颜色背景的动物 emoji 头像（用于 cursor label、share banner agent 行）
export function createAnimalAvatarEl(id: string, size = 16): HTMLElement {
  const animal = getAnimalForId(id);
  const el = document.createElement('span');
  el.style.cssText = [
    'display:inline-flex',
    'align-items:center',
    'justify-content:center',
    `width:${size}px`,
    `height:${size}px`,
    'border-radius:50%',
    `background:${animal.color}`,
    `font-size:${Math.round(size * 0.62)}px`,
    'flex-shrink:0',
    'line-height:1',
    'overflow:hidden',
  ].join(';');
  el.textContent = animal.emoji;
  el.setAttribute('aria-hidden', 'true');
  return el;
}

// 人类用户头像 emoji span（无背景，直接显示）
export function createHumanAvatarEl(size = 14): HTMLElement {
  const el = document.createElement('span');
  el.style.cssText = [
    `font-size:${size}px`,
    'line-height:1',
    'flex-shrink:0',
    'display:inline-block',
  ].join(';');
  el.textContent = '👤';
  el.setAttribute('aria-hidden', 'true');
  return el;
}
