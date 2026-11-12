# Conecta Estudante — versão com Node.js e SQLite

## Requisitos
- Node.js 20 ou superior
- npm (instalado junto com Node.js)

## Instalação no Fedora
No terminal, entre na pasta do projeto e execute:

```bash
sudo dnf install nodejs npm gcc-c++ make python3
npm install
npm start
```

Depois abra no navegador: http://localhost:3000

Para desenvolvimento com reinício automático:
```bash
npm run dev
```

## Banco de dados
Na primeira inicialização, o servidor cria automaticamente:
`data/conecta-estudante.sqlite`

As perguntas frequentes iniciais são cadastradas automaticamente se a tabela estiver vazia. O banco é persistente: parar o servidor não apaga os dados.

## Estrutura
- `index.html`: página inicial.
- `css/style.css`: estilos.
- `js/script.js`: carrega as perguntas pela API.
- `server.js`: backend Express e rotas da API.
- `data/`: arquivo SQLite criado ao iniciar.
- `package.json`: dependências e comandos.

## Rotas da API
- `GET /api/health` — verifica servidor e banco.
- `GET /api/faqs` — lista perguntas frequentes.
- `POST /api/auth/register` — cria conta (nome, email, password).
- `POST /api/auth/login` — inicia sessão (email, password).
- `POST /api/auth/logout` — encerra sessão.
- `GET /api/auth/me` — consulta usuário da sessão.
- `POST /api/confessions` — salva desabafo (requer login; content, anonymous).
- `GET /api/confessions/mine` — lista apenas os desabafos do usuário autenticado.
- `GET /api/forum/posts` — lista publicações do fórum.
- `POST /api/forum/posts` — cria publicação (requer login; title, content, category).
- `GET /api/forum/posts/:id/comments` — lista comentários.
- `POST /api/forum/posts/:id/comments` — cria comentário (requer login; content).

## Testes rápidos
Com o servidor ligado, abra outro terminal:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/faqs
```

## Observações importantes
- Esta é uma versão inicial para desenvolvimento e testes locais.
- As rotas de cadastro e login usam hash de senha com bcryptjs.
- Os desabafos não têm rota pública de listagem; cada usuário autenticado consulta somente os próprios.
- A opção anônima oculta a identidade no conceito da publicação, mas a aplicação mantém o vínculo interno com a conta para permitir que o usuário consulte seus próprios registros.
- `express-session` usa armazenamento em memória nesta versão local. Para publicar o site, será necessário trocar por armazenamento persistente de sessão, configurar HTTPS, segredo forte por variável de ambiente, proteção CSRF, limites de requisição, política de privacidade e processo de moderação.
- Não publique dados reais ou sensíveis enquanto o projeto estiver nesta fase de protótipo.
