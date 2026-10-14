import { describe, expect, it } from 'vitest'
import { cleanMessage, fromChatRow, fromMsgRow, MAX_LEN, whenLabel } from './chats'

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
})
