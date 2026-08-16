import { Module } from '@nestjs/common'
import { ICandidateBuilder, CandidateBuilder } from './services/candidate-builder.service'
import { ICandidateRanker, DeterministicCandidateRanker } from './services/candidate-ranker.service'

/**
 * Candidate module — transforms rule-engine output into ranked, bounded
 * candidate sets for context packages.
 *
 * The builder adapts rule candidates into assembly-ready candidates (with
 * deterministic compression hints); the ranker applies the weighted scoring
 * model with stable tie-breaking. Both are pure application services — no
 * Prisma, no I/O — and swappable via their interface tokens.
 */
@Module({
  providers: [
    { provide: ICandidateBuilder, useClass: CandidateBuilder },
    { provide: ICandidateRanker, useClass: DeterministicCandidateRanker },
  ],
  exports: [ICandidateBuilder, ICandidateRanker],
})
export class CandidateModule {}
