/** A personal philosophical sequence, used as the world's five destinations. */
export const WORLD_SECTORS = [
  {
    id: 'emotion', label: 'Emotion', x: -4, z: 0.5,
    title: 'Begin with what you feel.',
    description: 'Notice the feeling before you name it. There is room for both light and shadow.',
    symbol: '01',
  },
  {
    id: 'energy', label: 'Energy', x: -4.1, z: -2.8,
    title: 'Give the feeling a direction.',
    description: 'Let emotion become movement: a conversation, a question, a first step. Choose where your attention goes.',
    symbol: '02',
  },
  {
    id: 'vibration', label: 'Vibration', x: 2.5, z: -3.6,
    title: 'Listen to what resonates.',
    description: 'Some moments invite stillness. Others ask you to move. Make space to listen to both.',
    symbol: '03',
  },
  {
    id: 'frequency', label: 'Frequency', x: 4, z: 0.5,
    title: 'Find the rhythm you return to.',
    description: 'The things you practise become familiar. Return to the habits and intentions you want to live by.',
    symbol: '04',
  },
  {
    id: 'reality', label: 'Reality', x: 0, z: 4.3,
    title: 'Create intentionally.',
    description: 'Bring reflection into the everyday. A small, conscious action is a place to begin.',
    symbol: '05',
  },
] as const

export type SectorId = typeof WORLD_SECTORS[number]['id']
