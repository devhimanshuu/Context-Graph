import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { StatCard } from './stat-card'
import { Boxes } from 'lucide-react'

beforeEach(() => {
  cleanup()
})

describe('StatCard', () => {
  it('renders label', () => {
    render(<StatCard label="Total nodes" value="142" icon={Boxes} />)
    expect(screen.getByText('Total nodes')).toBeInTheDocument()
  })

  it('renders value', () => {
    render(<StatCard label="Total nodes" value="142" icon={Boxes} />)
    expect(screen.getByText('142')).toBeInTheDocument()
  })

  it('renders hint when provided', () => {
    render(<StatCard label="Total nodes" value="142" icon={Boxes} hint="Visible nodes" />)
    expect(screen.getByText('Visible nodes')).toBeInTheDocument()
  })

  it('renders badge when provided', () => {
    render(<StatCard label="Total nodes" value="142" icon={Boxes} badge="Phase 4" />)
    expect(screen.getByText('Phase 4')).toBeInTheDocument()
  })
})
