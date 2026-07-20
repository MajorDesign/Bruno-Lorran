import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import type { StatusVideo } from '../lib/types'

/* Primitivas de UI compartilhadas — mantêm a identidade visual consistente. */

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'subtle'

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-white hover:bg-accent-hover',
    ghost: 'border border-line bg-surface text-ink hover:bg-paper',
    subtle: 'bg-paper text-ink-soft hover:bg-line/60',
    danger: 'border border-accent/30 bg-accent-soft text-accent hover:bg-accent hover:text-white',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      {children}
    </label>
  )
}

export function TextInput({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}

export function StatusBadge({ status }: { status: StatusVideo }) {
  const map: Record<StatusVideo, { label: string; cls: string }> = {
    solicitado: {
      label: 'Solicitado',
      cls: 'bg-solicitado-bg text-solicitado',
    },
    assistido: {
      label: 'Assistido',
      cls: 'bg-assistido-bg text-assistido',
    },
  }
  const { label, cls } = map[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

export function LevelPill({ nivel }: { nivel: string | null }) {
  if (!nivel) return <span className="text-xs text-ink-faint">—</span>
  return (
    <span className="inline-flex rounded-md border border-line bg-paper px-2 py-0.5 text-xs font-medium text-ink-soft">
      {nivel}
    </span>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-ink-faint">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      {label ?? 'Carregando…'}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line bg-surface/60 px-6 py-14 text-center">
      <p className="font-display text-lg text-ink">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[var(--radius-card)] border border-line border-t-[3px] border-t-accent bg-surface shadow-sm ${className}`}
    >
      {children}
    </div>
  )
}

/* ============================================================
   Botões de ação padronizados (ícone + rótulo, cores do sistema).
   Use `size="sm"` para linhas de tabela.
   ============================================================ */
type ActionBtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { label?: string; size?: 'sm' | 'md' }

function actionCls(size: 'sm' | 'md') {
  const pad = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'
  return `inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${pad}`
}

export function BtnNovo({ label = 'Novo', size = 'md', className = '', children, ...p }: ActionBtnProps) {
  return (
    <button className={`${actionCls(size)} bg-accent text-white hover:bg-accent-hover ${className}`} {...p}>
      <IconPlus /> {children ?? label}
    </button>
  )
}

export function BtnSalvar({ label = 'Salvar', size = 'md', className = '', children, ...p }: ActionBtnProps) {
  return (
    <button className={`${actionCls(size)} bg-assistido text-white hover:brightness-110 ${className}`} {...p}>
      <IconSave /> {children ?? label}
    </button>
  )
}

export function BtnAlterar({ label = 'Alterar', size = 'md', className = '', children, ...p }: ActionBtnProps) {
  return (
    <button
      type="button"
      className={`${actionCls(size)} border border-line bg-surface text-ink hover:bg-paper ${className}`}
      {...p}
    >
      <span className="text-accent">
        <IconEdit />
      </span>{' '}
      {children ?? label}
    </button>
  )
}

export function BtnExcluir({ label = 'Excluir', size = 'md', className = '', children, ...p }: ActionBtnProps) {
  return (
    <button
      type="button"
      className={`${actionCls(size)} border border-red/30 bg-red-soft text-red hover:bg-red hover:text-white ${className}`}
      {...p}
    >
      <IconTrash /> {children ?? label}
    </button>
  )
}

export function BtnCancelar({ label = 'Cancelar', size = 'md', className = '', children, ...p }: ActionBtnProps) {
  return (
    <button type="button" className={`${actionCls(size)} text-ink-soft hover:bg-paper ${className}`} {...p}>
      <IconX /> {children ?? label}
    </button>
  )
}

/* Ícones dos botões */
function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}
function IconSave() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8M7 3v5h8" />
    </svg>
  )
}
function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  )
}
function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
    </svg>
  )
}
function IconX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}
