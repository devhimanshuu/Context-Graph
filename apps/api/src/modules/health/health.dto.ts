import { ApiProperty } from '@nestjs/swagger'

export class HealthStatusDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok'

  @ApiProperty({ example: 42.1 })
  uptime!: number

  @ApiProperty({ example: '2026-08-06T12:00:00.000Z' })
  timestamp!: string
}
