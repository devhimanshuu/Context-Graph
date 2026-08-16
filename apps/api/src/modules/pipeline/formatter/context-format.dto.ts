import { ApiProperty } from '@nestjs/swagger'

export class FormattedSectionDto {
  @ApiProperty()
  candidateId!: string

  @ApiProperty({ example: 1 })
  rank!: number

  @ApiProperty({ example: 'Delaying antibiotics pending cultures' })
  title!: string

  @ApiProperty({ description: 'Content rendered per the compression hint' })
  body!: string

  @ApiProperty({ example: 'SUMMARY' })
  compressionHint!: string

  @ApiProperty({ example: 96 })
  tokens!: number

  @ApiProperty({ example: false })
  truncated!: boolean
}

export class FormattedContextDocumentDto {
  @ApiProperty({ description: 'The prompt-ready document text' })
  text!: string

  @ApiProperty({ type: FormattedSectionDto, isArray: true })
  sections!: FormattedSectionDto[]

  @ApiProperty({ example: 512 })
  tokens!: number

  @ApiProperty({ example: 480 })
  contentTokens!: number

  @ApiProperty()
  requestId!: string

  @ApiProperty()
  packageId!: string

  @ApiProperty({ example: 'contextgraph-v1' })
  version!: string

  @ApiProperty()
  workspaceId!: string

  @ApiProperty()
  entryNodeId!: string

  @ApiProperty({ example: 3 })
  candidateCount!: number

  @ApiProperty({ example: false })
  truncated!: boolean
}
