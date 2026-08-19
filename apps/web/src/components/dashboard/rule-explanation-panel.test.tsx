import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import {
  RuleExplanationPanel,
  type RuleExplanationNode,
  type RuleExplanationEntry,
} from './rule-explanation-panel'

beforeEach(() => {
  cleanup()
})

const mockNodes: RuleExplanationNode[] = [
  { id: 'node-1', title: 'Clinical Safety Policy', included: true },
  { id: 'node-2', title: 'Expired Policy', included: false, excludedByBudget: false },
  { id: 'node-3', title: 'Budget Excluded', included: false, excludedByBudget: true },
]

const mockExplanations: RuleExplanationEntry[] = [
  {
    nodeId: 'node-1',
    included: true,
    finalReasonCode: null,
    failingRuleId: null,
    ruleResults: [
      {
        ruleId: 'global_injection',
        passed: true,
        reasonCode: 'GLOBAL_NODE',
        reason: 'Global node',
      },
      { ruleId: 'isolation', passed: true, reasonCode: 'ORG_MATCH', reason: 'Same organization' },
      { ruleId: 'compliance', passed: true, reasonCode: 'CLEAR', reason: 'Clearance sufficient' },
      { ruleId: 'permission', passed: true, reasonCode: 'PERMITTED', reason: 'Access allowed' },
      { ruleId: 'temporal', passed: true, reasonCode: 'ACTIVE', reason: 'Node active' },
      {
        ruleId: 'derivability',
        passed: true,
        reasonCode: 'DERIVABLE',
        reason: 'Content derivable',
      },
    ],
  },
  {
    nodeId: 'node-2',
    included: false,
    finalReasonCode: 'EXPIRED_NODE',
    failingRuleId: 'temporal',
    ruleResults: [
      {
        ruleId: 'global_injection',
        passed: true,
        reasonCode: 'GLOBAL_NODE',
        reason: 'Global node',
      },
      { ruleId: 'isolation', passed: true, reasonCode: 'ORG_MATCH', reason: 'Same organization' },
      { ruleId: 'compliance', passed: true, reasonCode: 'CLEAR', reason: 'Clearance sufficient' },
      { ruleId: 'permission', passed: true, reasonCode: 'PERMITTED', reason: 'Access allowed' },
      { ruleId: 'temporal', passed: false, reasonCode: 'EXPIRED_NODE', reason: 'Node expired' },
    ],
  },
]

const titleMap = new Map([
  ['node-1', 'Clinical Safety Policy'],
  ['node-2', 'Expired Policy'],
  ['node-3', 'Budget Excluded'],
])

describe('RuleExplanationPanel', () => {
  it('renders heading', () => {
    render(
      <RuleExplanationPanel
        nodes={mockNodes}
        explanations={mockExplanations}
        titleById={titleMap}
      />,
    )
    expect(screen.getByText('Why each node was included or excluded')).toBeInTheDocument()
  })

  it('renders all node titles', () => {
    render(
      <RuleExplanationPanel
        nodes={mockNodes}
        explanations={mockExplanations}
        titleById={titleMap}
      />,
    )
    expect(screen.getByText('Clinical Safety Policy')).toBeInTheDocument()
    expect(screen.getByText('Expired Policy')).toBeInTheDocument()
    expect(screen.getByText('Budget Excluded')).toBeInTheDocument()
  })

  it('shows included badge for included nodes', () => {
    render(
      <RuleExplanationPanel
        nodes={mockNodes}
        explanations={mockExplanations}
        titleById={titleMap}
      />,
    )
    const includedBadges = screen.getAllByText('included')
    expect(includedBadges.length).toBe(1)
  })

  it('shows excluded badge for non-budget excluded nodes', () => {
    render(
      <RuleExplanationPanel
        nodes={mockNodes}
        explanations={mockExplanations}
        titleById={titleMap}
      />,
    )
    expect(screen.getByText('excluded')).toBeInTheDocument()
  })

  it('shows budget badge for budget-excluded nodes', () => {
    render(
      <RuleExplanationPanel
        nodes={mockNodes}
        explanations={mockExplanations}
        titleById={titleMap}
      />,
    )
    expect(screen.getByText('budget')).toBeInTheDocument()
  })

  it('expands row to show rule verdicts when clicked', () => {
    render(
      <RuleExplanationPanel
        nodes={mockNodes}
        explanations={mockExplanations}
        titleById={titleMap}
      />,
    )
    const includedButton = screen.getByText('Clinical Safety Policy').closest('button')!
    fireEvent.click(includedButton)
    expect(screen.getByText('global_injection')).toBeInTheDocument()
    expect(screen.getByText('isolation')).toBeInTheDocument()
    expect(screen.getByText('temporal')).toBeInTheDocument()
  })

  it('shows empty message when no nodes', () => {
    render(<RuleExplanationPanel nodes={[]} explanations={[]} />)
    expect(screen.getByText('No nodes evaluated.')).toBeInTheDocument()
  })

  it('shows custom empty message', () => {
    render(<RuleExplanationPanel nodes={[]} explanations={[]} emptyMessage="No results" />)
    expect(screen.getByText('No results')).toBeInTheDocument()
  })
})
