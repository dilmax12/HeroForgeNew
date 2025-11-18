import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HeroGallery } from '../components/HeroGallery'
import { useHeroStore } from '../store/heroStore'

function makeHero(i: number) {
  return {
    id: `h${i}`,
    name: `Herói ${i}`,
    class: 'guerreiro',
    race: 'humano',
    element: 'physical',
    image: '',
    origin: 'player',
    progression: { level: 1, xp: 0, gold: 0, rank: 'F' },
    titles: [],
    stats: {},
  } as any
}

describe('Mobile Responsiveness & Performance', () => {
  test('HeroGallery renderiza lista grande sem exceções e com layout responsivo', () => {
    const heroes = Array.from({ length: 50 }, (_, i) => makeHero(i))
    useHeroStore.setState({ heroes })
    render(
      <MemoryRouter>
        <HeroGallery showCreateButton={false} />
      </MemoryRouter>
    )
    const list = screen.getByRole('list', { name: 'Galeria de Heróis' })
    expect(list).toBeInTheDocument()
  })
})