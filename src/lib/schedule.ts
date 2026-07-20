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

export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const WEEKDAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export const WORK_START = 7
export const WORK_END = 22

export interface Slot {
  weekday: number | null
  hora: string
}
export type Occupancy = Record<number, [number, number][]>

interface EventLike {
  start_at: string
  end_at: string
  student_id: string | null
  group_id: string | null
}

// Monta a ocupação da agenda (por dia da semana, em minutos), ignorando os
// eventos do próprio aluno/grupo que está sendo editado (serão substituídos).
export function buildOccupancy(events: EventLike[], exclude: { studentId?: string; groupId?: string }): Occupancy {
  const occ: Occupancy = {}
  for (const e of events) {
    if (exclude.studentId && e.student_id === exclude.studentId) continue
    if (exclude.groupId && e.group_id === exclude.groupId) continue
    const s = new Date(e.start_at)
    const en = new Date(e.end_at)
    ;(occ[s.getDay()] ??= []).push([s.getHours() * 60 + s.getMinutes(), en.getHours() * 60 + en.getMinutes()])
  }
  return occ
}

// Horários de início livres num dia, dada a duração e a ocupação + outros slots já escolhidos.
export function availableTimes(weekday: number, duration: number, occupancy: Occupancy, others: Slot[]): string[] {
  const busy: [number, number][] = [...(occupancy[weekday] ?? [])]
  for (const s of others) {
    if (s.weekday === weekday && s.hora) {
      const t = toMin(s.hora)
      busy.push([t, t + duration])
    }
  }
  const out: string[] = []
  for (let t = WORK_START * 60; t + duration <= WORK_END * 60; t += 30) {
    if (!busy.some(([bs, be]) => t < be && t + duration > bs)) out.push(toHHMM(t))
  }
  return out
}

// Primeiro conflito entre as ocorrências geradas e os eventos existentes.
export function firstConflict(
  occ: { start: Date; end: Date }[],
  existing: { start_at: string; end_at: string; titulo: string }[],
): { titulo: string; start: Date } | null {
  const ex = existing.map((e) => ({ s: new Date(e.start_at).getTime(), en: new Date(e.end_at).getTime(), titulo: e.titulo }))
  for (const o of occ) {
    const os = o.start.getTime()
    const oe = o.end.getTime()
    const c = ex.find((x) => os < x.en && x.s < oe)
    if (c) return { titulo: c.titulo, start: o.start }
  }
  return null
}

export function toMin(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + (m || 0)
}
export function toHHMM(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

// Gera eventos semanais para uma lista de horários (dia da semana + hora).
export function generateWeeklyEvents(
  dataInicio: string,
  slots: { weekday: number; hora: string }[],
  durationMin: number,
  repeatUntil: string | null,
  capMonths = 6,
): { start: Date; end: Date }[] {
  if (!dataInicio || slots.length === 0) return []
  const base = new Date(`${dataInicio}T00:00`)
  const hardEnd = repeatUntil ? new Date(`${repeatUntil}T23:59:59`) : addMonths(base, capMonths)
  const out: { start: Date; end: Date }[] = []
  for (const { weekday, hora } of slots) {
    const [h, m] = (hora || '09:00').split(':').map(Number)
    const diff = (weekday - base.getDay() + 7) % 7
    let d = addDays(base, diff)
    d = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h || 0, m || 0)
    let guard = 0
    while (d <= hardEnd && guard < 400) {
      out.push({ start: new Date(d), end: new Date(d.getTime() + durationMin * 60000) })
      d = addDays(d, 7)
      guard++
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime())
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
