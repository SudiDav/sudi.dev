'use client'

import Image from 'next/image'
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Puzzle, RotateCcw } from 'lucide-react'
import './portrait-puzzle.css'

const SIDE = 3
const GAP = SIDE * SIDE - 1
const ORDER = Array.from({ length: SIDE * SIDE }, (_, index) => index)
const INITIAL_BOARD = [4, 3, 1, 6, 0, 2, 7, GAP, 5]
const IMAGE_SIZES = '(max-width: 639px) min(80vw, 276px), 272px'

type Game = { pieces: number[]; moves: number }

function nextSpace(position: number, key: string) {
  const row = Math.floor(position / SIDE)
  const column = position % SIDE
  switch (key) {
    case 'ArrowLeft': return column > 0 ? position - 1 : null
    case 'ArrowRight': return column < SIDE - 1 ? position + 1 : null
    case 'ArrowUp': return row > 0 ? position - SIDE : null
    case 'ArrowDown': return row < SIDE - 1 ? position + SIDE : null
    default: return null
  }
}

const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']

function isSolved(pieces: number[]) {
  return pieces.every((piece, index) => piece === index)
}

function shuffle(): Game {
  // Scramble by sliding from the solved board so every result is reachable.
  const pieces = [...ORDER]
  let gap = GAP
  let previous = -1
  for (let move = 0; move < 18; move++) {
    const options = ARROWS.map(key => nextSpace(gap, key))
      .filter((space): space is number => space !== null && space !== previous)
    const space = options[Math.floor(Math.random() * options.length)]
    pieces[gap] = pieces[space]
    pieces[space] = GAP
    previous = gap
    gap = space
  }
  return { pieces: isSolved(pieces) ? [...INITIAL_BOARD] : pieces, moves: 0 }
}

function slide(game: Game | null, space: number | null) {
  if (!game || space === null || isSolved(game.pieces)) return game
  const gap = game.pieces.indexOf(GAP)
  if (!ARROWS.some(key => nextSpace(gap, key) === space)) return game

  const pieces = [...game.pieces]
  pieces[gap] = pieces[space]
  pieces[space] = GAP
  return { pieces, moves: game.moves + 1 }
}

export function PortraitPuzzle({ src, name, children }: { src: string; name: string; children: ReactNode }) {
  const [game, setGame] = useState<Game | null>(() => ({ pieces: [...INITIAL_BOARD], moves: 0 }))
  const board = useRef<HTMLDivElement>(null)
  const instructions = useId()
  const solved = game ? isSolved(game.pieces) : false
  const gap = game?.pieces.indexOf(GAP)

  function moveWithKey(event: KeyboardEvent<HTMLDivElement>) {
    const { key } = event
    if (!ARROWS.includes(key) || event.altKey || event.ctrlKey || event.metaKey) return
    event.preventDefault()
    setGame((current) => current && slide(current, nextSpace(current.pieces.indexOf(GAP), key)))
  }

  function play() {
    setGame(shuffle())
    requestAnimationFrame(() => board.current?.focus({ preventScroll: true }))
  }

  return (
    <div className="portrait-puzzle">
      <div className="home-profile__frame">
        <div className="home-profile__portrait">
          {game ? (
            <div
              ref={board}
              className="portrait-puzzle__board"
              role="group"
              tabIndex={0}
              aria-label={`Portrait puzzle of ${name}`}
              aria-describedby={instructions}
              data-solved={solved || undefined}
              onKeyDown={moveWithKey}
            >
              {solved ? (
                <Image src={src} alt={name} fill sizes={IMAGE_SIZES} className="home-profile__photo" />
              ) : (
                ORDER.map((piece) => {
                  const space = game.pieces.indexOf(piece)
                  const transform = `translate(${(space % SIDE) * 100}%, ${Math.floor(space / SIDE) * 100}%)`
                  if (piece === GAP) {
                    return <span key={piece} className="portrait-puzzle__gap" style={{ transform }} role="img" aria-label={`Gap at space ${space + 1}`} />
                  }

                  const movable = gap !== undefined && ARROWS.some(key => nextSpace(gap, key) === space)
                  return (
                    <button
                      type="button"
                      key={piece}
                      tabIndex={-1}
                      className="portrait-puzzle__tile"
                      style={{ transform }}
                      aria-label={`Piece ${piece + 1} at space ${space + 1}`}
                      aria-disabled={!movable}
                      onClick={() => {
                        if (!movable) return
                        setGame(current => slide(current, space))
                        board.current?.focus({ preventScroll: true })
                      }}
                    >
                      <span
                        className="portrait-puzzle__picture"
                        style={{ left: `${-(piece % SIDE) * 100}%`, top: `${-Math.floor(piece / SIDE) * 100}%` }}
                      >
                        <Image src={src} alt="" fill sizes={IMAGE_SIZES} draggable={false} className="home-profile__photo" />
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          ) : children}
        </div>
      </div>

      <div className="portrait-puzzle__controls">
        {game && (
          <p id={instructions} className="portrait-puzzle__instructions">
            {solved ? 'Picture complete.' : 'Click a tile next to the gap, or focus the puzzle and use arrow keys to move the gap.'}
            <span aria-live="polite">
              {solved ? 'Solved in ' : ''}{game.moves} {game.moves === 1 ? 'move' : 'moves'}{solved ? '!' : ''}
            </span>
          </p>
        )}

        <div className="portrait-puzzle__actions">
          <button type="button" onClick={game ? () => setGame(null) : play}>
            <Puzzle size={14} aria-hidden="true" />
            {game ? 'View portrait' : 'Play puzzle'}
          </button>
          {game && (
            <button type="button" onClick={play}>
              <RotateCcw size={13} aria-hidden="true" />
              {solved ? 'Play again' : 'Shuffle'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
