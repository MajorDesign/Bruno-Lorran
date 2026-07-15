// Tipos do domínio — refletem as tabelas do Supabase (supabase/schema.sql)

export type Nivel =
  | 'Beginner'
  | 'Elementary'
  | 'Pre-Intermediate'
  | 'Intermediate'
  | 'Upper-Intermediate'
  | 'Advanced'

// Lista usada nos selects do formulário. Mantida como constante para
// aparecer de forma consistente em alunos e vídeos.
export const NIVEIS: Nivel[] = [
  'Beginner',
  'Elementary',
  'Pre-Intermediate',
  'Intermediate',
  'Upper-Intermediate',
  'Advanced',
]

export type StatusVideo = 'solicitado' | 'assistido'

export interface Student {
  id: string
  nome: string
  email: string | null
  nivel: string | null
  created_at: string
}

export interface Video {
  id: string
  titulo: string
  nivel: string | null
  ordem: number
  created_at: string
}

export interface StudentVideo {
  id: string
  student_id: string
  video_id: string
  status: StatusVideo
  updated_at: string
}

// Vínculo já combinado com os dados do vídeo (para a tela do aluno)
export interface StudentVideoWithVideo extends StudentVideo {
  video: Video
}
