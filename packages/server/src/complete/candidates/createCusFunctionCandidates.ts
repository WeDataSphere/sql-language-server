import { toCompletionItemForCusFunction } from '../CompletionItemUtils'

const CLAUSES: string[] = [
   'TEST_CUS'
]

export function createCusFunctionCandidates() {
  return CLAUSES.map((v) => toCompletionItemForCusFunction(v))
}
