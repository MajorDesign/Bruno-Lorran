# Plataforma Bruno Lorran

Painel administrativo para acompanhar, por aluno, quais vídeos devem ser assistidos
e o controle manual de status (**Solicitado** / **Assistido**). Apenas o administrador
faz login — os alunos não têm acesso.

- **Frontend:** Vite + React + TypeScript + Tailwind CSS v4
- **Login + Banco:** Supabase (Postgres + Auth)
- **Deploy:** build estático (`dist/`) hospedado no Hostinger

## Configuração inicial

### 1. Criar o projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) → **New project**.
2. Em **SQL Editor > New query**, cole e rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Authentication > Users > Add user**, crie o login do administrador (e-mail + senha).
4. Em **Authentication > Providers > Email**, desative *Allow new users to sign up*
   (só o admin deve acessar).

### 2. Configurar as variáveis de ambiente
Copie `.env.example` para `.env` e preencha com os dados de **Settings > API** do Supabase:

```
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-public-key
```

### 3. Rodar localmente
```bash
npm install
npm run dev
```

## Build para produção (Hostinger)
```bash
npm run build
```
Sobe o conteúdo da pasta `dist/` para a pasta pública do Hostinger (`public_html`)
via hPanel (Gerenciador de Arquivos) ou FTP.

> Como é uma SPA (rotas no cliente), adicione um `.htaccess` em `public_html` para
> redirecionar todas as rotas ao `index.html` (será fornecido junto do deploy).

## Estrutura
```
src/
  lib/         cliente Supabase e tipos do domínio
  context/     autenticação (AuthContext)
  components/  layout, rota protegida e UI compartilhada
  pages/       Login, Alunos, Detalhe do aluno, Vídeos
supabase/
  schema.sql   tabelas, índices e políticas RLS
```
