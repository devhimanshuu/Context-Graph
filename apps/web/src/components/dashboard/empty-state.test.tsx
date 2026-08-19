import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { EmptyState } from './empty-state'
import { Boxes } from 'lucide-react'

beforeEach(() => {
  cleanup()
})

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState icon={Boxes} title="No data" description="Nothing here" />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<EmptyState icon={Boxes} title="No data" description="Nothing here" />)
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
  })

  it('renders icon', () => {
    const { container } = render(
      <EmptyState icon={Boxes} title="No data" description="Nothing here" />,
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders children when provided', () => {
    render(
      <EmptyState icon={Boxes} title="No data" description="Nothing here">
        <button>Action</button>
      </EmptyState>,
    )
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })
})
