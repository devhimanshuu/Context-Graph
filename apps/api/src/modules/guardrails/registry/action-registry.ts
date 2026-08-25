/* Action registry — central catalog of all known actions with risk levels, capabilities, and policies. */

import { Injectable } from '@nestjs/common'
import type { ActionDefinition } from '@contextgraph/types'
import { GuardrailRiskLevel } from '@contextgraph/types'
import { IActionRegistry } from '../domain/guardrails.interfaces'

/** Built-in action definitions. Each action has explicit risk, capabilities, and approval requirements. */
const BUILT_IN_ACTIONS: readonly ActionDefinition[] = [
  {
    actionId: 'READ_RESOURCE',
    name: 'Read Resource',
    description: 'Read a resource within the authorized organization scope',
    riskLevel: GuardrailRiskLevel.LOW,
    requiredCapabilities: ['resource.read'],
    targetTypes: ['KNOWLEDGE_NODE', 'DOCUMENT', 'WORKFLOW', 'AGENT'],
    policyRequirements: [],
    approvalRequired: false,
    approvalRiskLevels: [],
    configuration: {},
  },
  {
    actionId: 'CREATE_RESOURCE',
    name: 'Create Resource',
    description: 'Create a new resource within the authorized scope',
    riskLevel: GuardrailRiskLevel.MEDIUM,
    requiredCapabilities: ['resource.create'],
    targetTypes: ['KNOWLEDGE_NODE', 'DOCUMENT'],
    policyRequirements: [],
    approvalRequired: false,
    approvalRiskLevels: [],
    configuration: {},
  },
  {
    actionId: 'UPDATE_RESOURCE',
    name: 'Update Resource',
    description: 'Update an existing resource within the authorized scope',
    riskLevel: GuardrailRiskLevel.MEDIUM,
    requiredCapabilities: ['resource.update'],
    targetTypes: ['KNOWLEDGE_NODE', 'DOCUMENT', 'WORKFLOW'],
    policyRequirements: [],
    approvalRequired: false,
    approvalRiskLevels: [],
    configuration: {},
  },
  {
    actionId: 'DELETE_RESOURCE',
    name: 'Delete Resource',
    description: 'Delete or archive a resource',
    riskLevel: GuardrailRiskLevel.HIGH,
    requiredCapabilities: ['resource.delete'],
    targetTypes: ['KNOWLEDGE_NODE', 'DOCUMENT'],
    policyRequirements: [],
    approvalRequired: false,
    approvalRiskLevels: [],
    configuration: {},
  },
  {
    actionId: 'UPDATE_KNOWLEDGE',
    name: 'Update Knowledge',
    description: 'Modify knowledge node content or metadata',
    riskLevel: GuardrailRiskLevel.MEDIUM,
    requiredCapabilities: ['knowledge.write'],
    targetTypes: ['KNOWLEDGE_NODE'],
    policyRequirements: [],
    approvalRequired: false,
    approvalRiskLevels: [],
    configuration: {},
  },
  {
    actionId: 'CREATE_KNOWLEDGE',
    name: 'Create Knowledge',
    description: 'Create a new knowledge node in the graph',
    riskLevel: GuardrailRiskLevel.MEDIUM,
    requiredCapabilities: ['knowledge.create'],
    targetTypes: ['KNOWLEDGE_NODE'],
    policyRequirements: [],
    approvalRequired: false,
    approvalRiskLevels: [],
    configuration: {},
  },
  {
    actionId: 'ARCHIVE_KNOWLEDGE',
    name: 'Archive Knowledge',
    description: 'Archive a knowledge node, removing it from active use',
    riskLevel: GuardrailRiskLevel.HIGH,
    requiredCapabilities: ['knowledge.archive'],
    targetTypes: ['KNOWLEDGE_NODE'],
    policyRequirements: [],
    approvalRequired: false,
    approvalRiskLevels: [],
    configuration: {},
  },
  {
    actionId: 'PUBLISH_KNOWLEDGE',
    name: 'Publish Knowledge',
    description: 'Publish knowledge from draft to active status',
    riskLevel: GuardrailRiskLevel.HIGH,
    requiredCapabilities: ['knowledge.publish'],
    targetTypes: ['KNOWLEDGE_NODE'],
    policyRequirements: [],
    approvalRequired: false,
    approvalRiskLevels: [],
    configuration: {},
  },
  {
    actionId: 'SEND_EXTERNAL_MESSAGE',
    name: 'Send External Message',
    description: 'Send a message or communication outside the organization boundary',
    riskLevel: GuardrailRiskLevel.CRITICAL,
    requiredCapabilities: ['communication.send_external'],
    targetTypes: ['CUSTOMER', 'EXTERNAL_PARTY'],
    policyRequirements: [],
    approvalRequired: true,
    approvalRiskLevels: [GuardrailRiskLevel.CRITICAL],
    configuration: {},
  },
  {
    actionId: 'APPROVE_OPERATION',
    name: 'Approve Operation',
    description: 'Approve a pending operation or request',
    riskLevel: GuardrailRiskLevel.HIGH,
    requiredCapabilities: ['approval.approve'],
    targetTypes: ['WORKFLOW', 'AGENT', 'KNOWLEDGE_NODE'],
    policyRequirements: [],
    approvalRequired: false,
    approvalRiskLevels: [],
    configuration: {},
  },
  {
    actionId: 'EXECUTE_WORKFLOW',
    name: 'Execute Workflow',
    description: 'Execute a defined workflow',
    riskLevel: GuardrailRiskLevel.MEDIUM,
    requiredCapabilities: ['workflow.execute'],
    targetTypes: ['WORKFLOW'],
    policyRequirements: [],
    approvalRequired: false,
    approvalRiskLevels: [],
    configuration: {},
  },
  {
    actionId: 'EXECUTE_TOOL',
    name: 'Execute Tool',
    description: 'Execute a tool through the agent runtime',
    riskLevel: GuardrailRiskLevel.MEDIUM,
    requiredCapabilities: ['agent.execute'],
    targetTypes: ['TOOL'],
    policyRequirements: [],
    approvalRequired: false,
    approvalRiskLevels: [],
    configuration: {},
  },
]

@Injectable()
export class ActionRegistry implements IActionRegistry {
  private readonly actions = new Map<string, ActionDefinition>()

  constructor() {
    // Register all built-in actions on construction.
    for (const action of BUILT_IN_ACTIONS) {
      this.actions.set(action.actionId, action)
    }
  }

  register(definition: ActionDefinition): void {
    if (this.actions.has(definition.actionId)) {
      throw new Error(`Action '${definition.actionId}' is already registered`)
    }
    this.actions.set(definition.actionId, definition)
  }

  get(actionId: string): ActionDefinition | undefined {
    return this.actions.get(actionId)
  }

  getAll(): readonly ActionDefinition[] {
    return [...this.actions.values()]
  }

  getByTargetType(targetType: string): readonly ActionDefinition[] {
    return this.getAll().filter((def) => def.targetTypes.includes(targetType))
  }
}
