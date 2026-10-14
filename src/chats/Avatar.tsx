import type { Chat } from './chats'

export const Avatar = ({ c, size = 56 }: { c: Pick<Chat, 'name' | 'photo'>; size?: number }) => {
  const style = { width: size, height: size, fontSize: size * 0.5 }
  return c.photo
    ? <img className="ch-av" style={style} src={c.photo} alt="" />
    : <span className="ch-av ch-init" style={style} aria-hidden="true">{c.name.slice(0, 1).toUpperCase()}</span>
}
