import { describe, expect, it } from 'vitest'
import { validateSubmission } from './validation'

const valid = {
  articleSlug: 'after-amen',
  parentId: null,
  guestName: 'Ada',
  body: 'A thoughtful response.',
}

describe('validateSubmission', () => {
  it('trims a valid submission', () => {
    expect(
      validateSubmission({ ...valid, guestName: ' Ada ', body: ' Thoughtful. ' }),
    ).toEqual({
      ok: true,
      value: { ...valid, guestName: 'Ada', body: 'Thoughtful.' },
    })
  })

  it('rejects an invalid article slug', () => {
    expect(validateSubmission({ ...valid, articleSlug: '../admin' })).toEqual({
      ok: false,
      message: 'This article cannot accept comments.',
    })
  })

  it('rejects an invalid parent id', () => {
    expect(validateSubmission({ ...valid, parentId: 'not-a-comment' })).toEqual({
      ok: false,
      message: 'That reply target is no longer available.',
    })
  })

  it('rejects a guest name over 80 characters', () => {
    expect(validateSubmission({ ...valid, guestName: 'a'.repeat(81) })).toEqual({
      ok: false,
      message: 'Use a name with 80 characters or fewer.',
    })
  })

  it.each([
    ['', 'Write a comment before posting.'],
    ['a'.repeat(4001), 'Keep your comment to 4,000 characters or fewer.'],
  ])('rejects an invalid comment body', (body, message) => {
    expect(validateSubmission({ ...valid, body })).toEqual({ ok: false, message })
  })

  it('rejects more than two links', () => {
    expect(
      validateSubmission({
        ...valid,
        body: 'https://one.test http://two.test https://three.test',
      }),
    ).toEqual({
      ok: false,
      message: 'Comments can include at most two links.',
    })
  })
})
