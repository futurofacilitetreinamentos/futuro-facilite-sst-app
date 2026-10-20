# Futuro Facilite SST

Sistema de gestão de Saúde e Segurança do Trabalho para condomínios: cadastro
central, inspeção com checklist e fotos, inventário de riscos, PGR, DRPS (NR-1),
PCMSO, LTCAT e plano de ação. Reescrita da V8 com dados na nuvem (Supabase).

**Stack:** React + TypeScript + Vite · Supabase (Postgres, Auth, Storage) · GitHub Pages.

## 1. Criar o banco (uma vez)

1. Crie uma conta e um projeto em [supabase.com](https://supabase.com) (região São Paulo).
2. Em **SQL Editor > New query**, cole o conteúdo de `supabase/migrations/0001_init.sql` e clique **Run**.
3. Em **Authentication > Sign In / Providers**, desative **Allow new users to sign up**
   (só o administrador cria usuários).
4. Em **Authentication > URL Configuration**, coloque o endereço do site em **Site URL**
   (ex.: `https://futurofacilitetreinamentos.github.io/futuro-facilite-sst-app/`)
   e adicione `http://localhost:5173/` em **Redirect URLs**.
5. Crie o primeiro usuário em **Authentication > Users > Add user** (marque *Auto Confirm*)
   e torne-o administrador no SQL Editor:

   ```sql
   update profiles set role = 'admin', nome = 'Seu Nome' where email = 'seu@email.com';
   ```

6. (Opcional, para criar usuários pelo app) publique a função de administração:

   ```bash
   npx supabase login
   npx supabase functions deploy admin-users --project-ref SEU_REF
   ```

## 2. Rodar localmente

```bash
npm install
cp .env.example .env.local   # e preencha URL e chave anon
npm run dev
```

## 3. Publicar no GitHub Pages

1. Crie um repositório novo (ex.: `futuro-facilite-sst-app`) e envie esta pasta.
2. Em **Settings > Secrets and variables > Actions > Variables**, crie
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Em **Settings > Pages**, escolha **Source: GitHub Actions**.
4. Cada `push` na branch `main` publica automaticamente.

## Migração da V8

Menu **Importar dados V8**: siga as instruções da tela para baixar o backup do
navegador antigo e importar condomínios, cadastros, inspeções (com fotos) e
respostas DRPS.

## Link do DRPS

Cada condomínio tem um link exclusivo (`#/drps-form/<token>`), que pode ser enviado
por WhatsApp. As respostas chegam direto no banco, de qualquer celular, sem login.
