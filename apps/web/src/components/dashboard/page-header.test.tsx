import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { PageHeader } from './page-header'

beforeEach(() => {
  cleanup()
})

describe('PageHeader', () => {
  it('renders title', () => {
    render(<PageHeader title="Dashboard" description="Overview" />)
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<PageHeader title="Dashboard" description="Overview" />)
    expect(screen.getByText('Overview')).toBeInTheDocument()
  })

  it('renders children (actions)', () => {
    render(
      <PageHeader title="Dashboard" description="Overview">
        <button>Action</button>
      </PageHeader>,
    )
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument()
  })
})
