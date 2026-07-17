import type { Recurrence } from './types'

// Gera as datas de ocorrência a partir de um início, recorrência e limite.
// Se não houver "repetir até", limita a `capMonths` meses (evita gerar demais).
export function generateOccurrences(
  start: Date,
  recurrence: Recurrence,
  repeatUntil: Date | null,
  capMonths = 6,
): Date[] {
  if (recurrence === 'nenhuma') return [new Date(start)]
  const hardEnd = repeatUntil ?? addMonths(start, capMonths)
  const out: Date[] = []
  let cur = new Date(start)
  let guard = 0
  while (cur <= hardEnd && guard < 500) {
    out.push(new Date(cur))
    if (recurrence === 'mensal') cur = addMonths(cur, 1)
    else cur = addDays(cur, recurrence === 'quinzenal' ? 14 : 7)
    guard++
  }
  return out
}

export function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes())
}
export function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate(), d.getHours(), d.getMinutes())
}
export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
