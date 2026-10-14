import { describe, expect, it } from 'vitest'
import { cleanMessage, dayLabel, fromChatRow, fromMsgRow, layoutThread, MAX_LEN, openers, whenLabel, type Msg } from './chats'

const now = new Date('2026-10-14T12:00:00Z') // 1pm in Lagos

describe('chats', () => {
  it('labels times the way an inbox does', () => {
    expect(whenLabel('', now)).toBe('')
    expect(whenLabel('2026-10-14T09:15:00Z', now)).toBe('10:15')
    expect(whenLabel('2026-10-12T09:15:00Z', now)).toBe('Mon')
    expect(whenLabel('2026-09-02T09:15:00Z', now)).toBe('2 Sept')
  })
  it('trims and caps what you send', () => {
    expect(cleanMessage('  hi  ')).toBe('hi')
    expect(cleanMessage('x'.repeat(MAX_LEN + 50))).toHaveLength(MAX_LEN)
  })
  it('reads rows from the database', () => {
    expect(fromChatRow({ person_id: 'p', name: 'A', photo: null, last_body: null, last_at: null, last_mine: false, unread: 2 })).toMatchObject({ personId: 'p', lastBody: '', unread: 2 })
    expect(fromMsgRow({ id: '1', sender_id: 'me', body: 'yo', created_at: 't' }, 'me').mine).toBe(true)
    expect(fromMsgRow({ id: '1', sender_id: 'them', body: 'yo', created_at: 't' }, 'me').mine).toBe(false)
  })

  const m = (id: string, mine: boolean, at: string): Msg => ({ id, mine, body: id, at })
  it('names days the way people do', () => {
    expect(dayLabel('2026-10-14T09:00:00Z', now)).toBe('Today')
    expect(dayLabel('2026-10-13T09:00:00Z', now)).toBe('Yesterday')
    expect(dayLabel('2026-10-02T09:00:00Z', now)).toBe('Fri 2 Oct')
  })
  it('groups runs and adds a heading when the day changes', () => {
    const rows = layoutThread([
      m('a', false, '2026-10-13T09:00:00Z'), m('b', false, '2026-10-13T09:01:00Z'), m('c', true, '2026-10-13T09:02:00Z'),
      m('d', true, '2026-10-14T09:00:00Z'),
    ], now)
    expect(rows.map((r) => (r.kind === 'day' ? r.label : `${r.msg.id}${r.first ? '^' : ''}${r.last ? '$' : ''}`))).toEqual(['Yesterday', 'a^', 'b$', 'c^$', 'Today', 'd^$'])
  })
  it('starts a new run after a long pause', () => {
    const rows = layoutThread([m('a', true, '2026-10-14T09:00:00Z'), m('b', true, '2026-10-14T09:30:00Z')], now)
    expect(rows.filter((r) => r.kind === 'msg').map((r) => r.kind === 'msg' && r.first)).toEqual([true, true])
  })
  it('suggests an opener from their hot take when they have one', () => {
    expect(openers('Jollof is better the next day.')[0]).toContain('Jollof')
    expect(openers()).toHaveLength(3)
  })
})
