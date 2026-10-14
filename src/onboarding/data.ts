/** Things a friend would say about you. The same words are used for who you want at your table, so they must be traits, not interests. */
export const TAGS = [
  'Funny', 'Curious', 'Ambitious', 'Creative', 'Calm', 'Adventurous',
  'Warm', 'Witty', 'Loyal', 'Thoughtful', 'Playful', 'Confident',
  'Easygoing', 'Driven', 'Outspoken', 'Kind', 'Generous', 'Down-to-earth',
]

export const AREAS = ['Island', 'Mainland']

export const TAKE_IDEAS = [
  'Jollof is better when it is a little burnt.',
  'Nobody actually enjoys owambe.',
  'Traffic is the real reason people stay single.',
  'Suya is a better first date than dinner.',
  'The mainland is better than the island.',
  'Group chats should be deleted every December.',
]

export const INTENTS = [
  { id: 'date', label: 'Someone to date' },
  { id: 'friends', label: 'New friends' },
  { id: 'either', label: 'Open to either' },
] as const

export const TOPICS = ['Music', 'Football', 'Tech', 'Business', 'Faith', 'Food', 'Film', 'Travel', 'Fashion', 'Books', 'Fitness', 'Politics', 'Art', 'Gaming']
export const MAX_TOPICS = 4

export const PACES = [
  { id: 'quick', label: 'Quick to start talking' },
  { id: 'warm', label: 'Quiet at first, better once warmed up' },
  { id: 'listen', label: 'I like to listen first' },
] as const
