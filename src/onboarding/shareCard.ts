import type { Profile } from './types'

/** Where the invite link goes once there is a real domain. Left empty, the card shows only the schedule. */
export const INVITE_LINK = ''

export type ShareStyle = 'cream' | 'gold' | 'night'
export type ShareStamp = 'none' | 'in' | 'friday'
export interface ShareOpts { style: ShareStyle; stamp: ShareStamp; words: boolean }
export const DEFAULT_SHARE: ShareOpts = { style: 'cream', stamp: 'in', words: true }
const STYLES: Record<ShareStyle, { paper: string; ink: string; sub: string }> = {
  cream: { paper: '#efe6cf', ink: '#1d1608', sub: 'rgba(29,22,8,0.6)' },
  gold: { paper: '#ffc24a', ink: '#1a1203', sub: 'rgba(26,18,3,0.65)' },
  night: { paper: '#1b1e25', ink: '#f4f2ed', sub: 'rgba(244,242,237,0.6)' },
}
const STAMPS: Record<Exclude<ShareStamp, 'none'>, string[]> = { in: ["I'M", 'GOING'], friday: ['SEE YOU', 'FRIDAY'] }

export const SHARE_W = 1080
export const SHARE_H = 1920

const INK = '#f4f2ed'
const MUTED = '#9b9da6'
const GOLD = '#ffc24a'

type Ctx = CanvasRenderingContext2D

function font(ctx: Ctx, weight: number, size: number, family: string, stretch: CanvasFontStretch = 'normal', spacing = '0px') {
  ctx.font = `${weight} ${size}px ${family}`
  ctx.fontStretch = stretch
  ctx.letterSpacing = spacing
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrap(ctx: Ctx, text: string, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (line && ctx.measureText(next).width > max) { lines.push(line); line = word } else line = next
  }
  if (line) lines.push(line)
  return lines
}

/** Story-sized (9:16) card for "I just signed up for Pàdé". Shows a first name and three words only: no age, area, contact or photo. */
export async function drawShareCard(profile: Profile, canvas: HTMLCanvasElement = document.createElement('canvas'), opts: ShareOpts = DEFAULT_SHARE): Promise<HTMLCanvasElement> {
  try {
    await Promise.all([
      document.fonts.load('900 96px Archivo'),
      document.fonts.load('800 96px "Hanken Grotesk"'),
      document.fonts.load('600 32px "Hanken Grotesk"'),
      document.fonts.load('500 24px "DM Mono"'),
    ])
  } catch { /* fall back to system fonts */ }

  canvas.width = SHARE_W
  canvas.height = SHARE_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const cx = SHARE_W / 2
  const st = STYLES[opts.style]
  const HANKEN = '"Hanken Grotesk", system-ui, sans-serif'
  const ARCHIVO = 'Archivo, "Arial Narrow", Arial, sans-serif'
  const MONO = '"DM Mono", ui-monospace, monospace'

  // ground and gold glow
  ctx.fillStyle = '#0b0c0f'
  ctx.fillRect(0, 0, SHARE_W, SHARE_H)
  ctx.save()
  ctx.translate(cx, 770)
  ctx.scale(1, 0.8)
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1040)
  glow.addColorStop(0, 'rgba(255,194,74,0.2)')
  glow.addColorStop(0.7, 'rgba(255,194,74,0)')
  ctx.fillStyle = glow
  ctx.fillRect(-1040, -1040, 2080, 2080)
  ctx.restore()

  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'

  // wordmark, accents in gold
  font(ctx, 900, 96, ARCHIVO, 'extra-condensed', '-1px')
  const parts: [string, string][] = [['P', INK], ['à', GOLD], ['d', INK], ['é', GOLD]]
  const total = parts.reduce((s, [t]) => s + ctx.measureText(t).width, 0)
  ctx.textAlign = 'left'
  let x = cx - total / 2
  for (const [t, col] of parts) { ctx.fillStyle = col; ctx.fillText(t, x, 210); x += ctx.measureText(t).width }

  // headline
  ctx.textAlign = 'center'
  ctx.fillStyle = INK
  font(ctx, 800, 108, HANKEN, 'normal', '-4px')
  const lines = wrap(ctx, 'I just signed up for Pàdé.', 760)
  lines.forEach((l, i) => ctx.fillText(l, cx, 610 + i * 112))

  // ticket
  const tw = 860
  const th = 400
  const ty = 1130
  ctx.save()
  ctx.translate(cx, ty)
  ctx.rotate((-4 * Math.PI) / 180)
  ctx.shadowColor = 'rgba(0,0,0,0.55)'
  ctx.shadowBlur = 80
  ctx.shadowOffsetY = 36
  roundRect(ctx, -tw / 2, -th / 2, tw, th, 38)
  ctx.fillStyle = st.paper
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.textAlign = 'left'
  const left = -tw / 2 + 56
  ctx.fillStyle = st.sub
  font(ctx, 500, 24, MONO, 'normal', '3px')
  ctx.fillText('PÀDÉ · ADMIT ONE', left, -th / 2 + 70)

  // name, shrunk to fit beside the stamp
  const name = (profile.name || 'You').toUpperCase()
  let size = 150
  font(ctx, 900, size, ARCHIVO, 'extra-condensed', '0px')
  const room = tw - 56 - 56 - (opts.stamp === 'none' ? 0 : 190)
  while (ctx.measureText(name).width > room && size > 60) { size -= 4; font(ctx, 900, size, ARCHIVO, 'extra-condensed', '0px') }
  ctx.fillStyle = st.ink
  ctx.fillText(name, left, -th / 2 + 70 + 20 + size * 0.85)

  // three words
  let tx = left
  const tagY = th / 2 - 56
  font(ctx, 800, 28, HANKEN, 'normal', '0px')
  for (const word of opts.words ? profile.you.slice(0, 3) : []) {
    const w = ctx.measureText(word).width + 40
    ctx.save()
    ctx.translate(tx + w / 2, tagY)
    ctx.rotate(((word.length % 3) - 1) * 0.03)
    roundRect(ctx, -w / 2, -26, w, 52, 12)
    ctx.lineWidth = 3
    ctx.strokeStyle = st.ink
    ctx.stroke()
    ctx.fillStyle = st.ink
    ctx.textAlign = 'center'
    ctx.fillText(word, 0, 10)
    ctx.restore()
    tx += w + 14
  }

  // stamp
  if (opts.stamp !== 'none') {
    const lines = STAMPS[opts.stamp]
    const red = opts.style === 'night' ? '#ff6b61' : '#b3261e'
    ctx.save()
    ctx.translate(tw / 2 - 56 - 70, 6)
    ctx.rotate((-8 * Math.PI) / 180)
    roundRect(ctx, -70, -50, 140, 100, 12)
    ctx.lineWidth = 5
    ctx.strokeStyle = red
    ctx.stroke()
    ctx.fillStyle = red
    ctx.textAlign = 'center'
    font(ctx, 900, 38, ARCHIVO, 'extra-condensed', '0px')
    lines.forEach((l, i) => ctx.fillText(l, 0, -4 + i * 40))
    ctx.restore()
  }
  ctx.restore()

  // footer
  ctx.textAlign = 'center'
  ctx.fillStyle = INK
  font(ctx, 600, 40, HANKEN, 'normal', '0px')
  ctx.fillText('Meet someone new, five minutes at a time.', cx, 1690)
  ctx.fillStyle = MUTED
  font(ctx, 500, 28, MONO, 'normal', '0px')
  ctx.fillText(`Fridays, 9 to 10pm, Lagos${INVITE_LINK ? ` · ${INVITE_LINK}` : ''}`, cx, 1760)
  return canvas
}

export function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Could not make the image'))), 'image/png'))
}
