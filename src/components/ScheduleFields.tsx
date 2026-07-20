import { type Dispatch, type SetStateAction } from 'react'
import { DURACOES } from '../lib/types'
import { WEEKDAYS_FULL, WORK_END, WORK_START, availableTimes, type Occupancy, type Slot } from '../lib/schedule'
import { Field, Select, TextInput } from './ui'

// Campos de agenda reutilizados por aluno e por grupo:
// duração, quantas vezes por semana, dias + horários livres, data e repetição.
export function ScheduleFields({
  vezes,
  setVezes,
  slots,
  setSlots,
  duracao,
  setDuracao,
  occupancy,
  dataInicio,
  setDataInicio,
  repetirAte,
  setRepetirAte,
}: {
  vezes: number
  setVezes: (n: number) => void
  slots: Slot[]
  setSlots: Dispatch<SetStateAction<Slot[]>>
  duracao: number
  setDuracao: (n: number) => void
  occupancy: Occupancy
  dataInicio: string
  setDataInicio: (s: string) => void
  repetirAte: string
  setRepetirAte: (s: string) => void
}) {
  function changeVezes(n: number) {
    setVezes(n)
    setSlots((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? { weekday: null, hora: '' }))
  }
  function setWeekday(idx: number, wd: number | null) {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { weekday: wd, hora: '' } : s)))
  }
  function setHora(idx: number, hora: string) {
    setSlots((prev) => prev.map((s, i) => (i === idx ? { ...s, hora } : s)))
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Duração de cada aula">
          <Select value={duracao} onChange={(e) => setDuracao(Number(e.target.value))}>
            {DURACOES.map((d) => (
              <option key={d} value={d}>
                {d} minutos
              </option>
            ))}
            {!DURACOES.includes(duracao as (typeof DURACOES)[number]) && <option value={duracao}>{duracao} minutos</option>}
          </Select>
        </Field>
        <Field label="Quantas vezes por semana?">
          <Select value={vezes} onChange={(e) => changeVezes(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}x por semana
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-faint">Dias e horários disponíveis</span>
        <div className="space-y-2">
          {slots.map((slot, idx) => {
            const others = slots.filter((_, i) => i !== idx)
            const horas = slot.weekday != null ? availableTimes(slot.weekday, duracao, occupancy, others) : []
            return (
              <div key={idx} className="flex flex-wrap items-center gap-2">
                <span className="w-14 text-sm text-ink-faint">Aula {idx + 1}</span>
                <Select
                  value={slot.weekday ?? ''}
                  onChange={(e) => setWeekday(idx, e.target.value === '' ? null : Number(e.target.value))}
                  className="w-40"
                >
                  <option value="">Dia da semana…</option>
                  {WEEKDAYS_FULL.map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </Select>
                <Select value={slot.hora} onChange={(e) => setHora(idx, e.target.value)} disabled={slot.weekday == null} className="w-40">
                  <option value="">{slot.weekday == null ? 'Escolha o dia' : 'Horário…'}</option>
                  {horas.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                  {slot.hora && !horas.includes(slot.hora) && <option value={slot.hora}>{slot.hora} (ocupado)</option>}
                </Select>
                {slot.weekday != null && horas.length === 0 && <span className="text-xs text-red">Sem horário livre neste dia</span>}
              </div>
            )
          })}
        </div>
        <p className="mt-1.5 text-xs text-ink-faint">
          Os horários mostram apenas os livres ({WORK_START}h–{WORK_END}h), considerando as aulas já marcadas (inclusive grupos).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data de início">
          <TextInput type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </Field>
        <Field label="Repetir até (opcional)">
          <TextInput type="date" value={repetirAte} onChange={(e) => setRepetirAte(e.target.value)} />
        </Field>
      </div>
    </div>
  )
}
