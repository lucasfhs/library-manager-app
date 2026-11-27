# Previews do Library Manager

GIFs feitos com **capturas reais do projeto executado localmente**, a partir do build
de produção do frontend, da API Express e de um PostgreSQL 18 temporário. Não há
respostas de API simuladas nem dados de exemplo embutidos na interface: tudo o que
aparece foi lido do banco ou gravado nele durante a captura. Moldura, legendas,
cursor destacado e transições são elementos editoriais.

| Arquivo | Conteúdo | Duração aproximada | Tamanho |
| --- | --- | --- | --- |
| [library-manager-demo.gif](./library-manager-demo.gif) | Visão geral das oito etapas | 34 s | 3,4 MiB |
| [library-manager-admin.gif](./library-manager-admin.gif) | Painel, livros, estoque e devoluções | 24 s | 1,4 MiB |
| [library-manager-catalogo.gif](./library-manager-catalogo.gif) | Catálogo do leitor, pedido de empréstimo e histórico | 13 s | 0,5 MiB |

Todos têm resolução de **1280 × 1000**, legendas em português e reprodução em loop.
A ilustração original `domestic-life-illustrated.jpg` foi preservada.

## O que a demonstração comprova

1. A página inicial e a tela de acesso renderizam no navegador.
2. O login de operador é validado pela API Express conectada ao PostgreSQL 18.
3. O painel mostra indicadores, empréstimos recentes e o acervo por categoria
   calculados a partir do banco.
4. A edição de um livro (Fundação, de 320 para 336 páginas) é gravada no banco.
5. O estoque de Fundação na Biblioteca Central passa de 2 para 4 exemplares e é salvo.
6. Um empréstimo atrasado é filtrado e devolvido; o gatilho do banco repõe o estoque.
7. O leitor busca um livro, consulta a disponibilidade por biblioteca e solicita o
   empréstimo; o estoque cai de 7 para 6.
8. O novo empréstimo aparece no histórico do leitor com o prazo de devolução.

Cada etapa é conferida pelo script (`validation.json`), e a captura falha se o
navegador registrar qualquer erro de JavaScript.

### Observações

- As contas usadas são as de demonstração do `init.sql` (operador `admin` e o
  leitor João Pedro). As senhas não aparecem nas imagens.
- Respostas 4xx esperadas da API, como regras de negócio, não contam como erro.
- Os dados de demonstração vêm do SQL original; nenhuma informação pessoal real
  foi digitada durante a gravação.

## Como recriar os GIFs

### Requisitos

- Node.js 22.22 ou superior, npm e Python 3.
- FFmpeg no `PATH`.
- Pillow: `python3 -m pip install -r preview/tools/requirements.txt`.
  Se o sistema restringir instalações Python, use um ambiente virtual.
- Fontes Noto Sans ou DejaVu Sans; alternativamente, configure
  `PREVIEW_FONT` e `PREVIEW_FONT_BOLD` com caminhos de arquivos TTF.
- Chromium do Playwright ou Chrome instalado.

A captura foi validada em Linux. Ela não requer Docker, PostgreSQL instalado
globalmente, acesso administrativo nem mudanças nos arquivos `.env`.

### 1. Instalar as dependências

Na raiz do repositório:

```bash
npm ci --prefix frontend
npm ci --prefix backend
npm ci --prefix preview/tools
```

Para usar o navegador do Playwright:

```bash
cd preview/tools
npx playwright install chromium
cd ../..
```

### 2. Capturar o sistema

```bash
npm run capture --prefix preview/tools
```

Se preferir o Chrome já instalado no Linux:

```bash
CHROME_PATH=/usr/bin/google-chrome npm run capture --prefix preview/tools
```

O script:

- cria um cluster PostgreSQL 18 isolado em um diretório temporário;
- importa `backend/database/init.sql` pelo protocolo COPY, preservando os dados;
- escolhe portas locais livres e credenciais temporárias;
- gera o build de produção do frontend e o serve com `vite preview`, junto com
  o backend, ambos restritos a `127.0.0.1`;
- percorre os fluxos de operador e de leitor, verificando cada gravação;
- encerra os serviços e apaga o banco e o build temporários.

Os bancos e volumes existentes não são acessados. Para usar outro diretório
temporário, defina `PREVIEW_TMP`.

### 3. Compor e otimizar

Na raiz do repositório:

```bash
python3 preview/tools/render.py
```

O renderizador recria os três GIFs desta pasta com uma paleta compartilhada,
transições entre seções e movimentos de cursor. O FFmpeg otimiza os retângulos
alterados sem acrescentar telas fictícias.

### 4. Revisar

Os intermediários ficam em `preview/tools/.capture/`, ignorado pelo Git:

- `review.jpg`: painel com as oito seções para inspeção visual.
- `scenes.json`: ordem, duração, rota, legendas e posições do cursor.
- `validation.json`: verificações de cada etapa e erros do navegador.
- `render-validation.json`: tamanho, resolução e duração dos GIFs.
- `backend.log`, `frontend.log` e `frontend-build.log`: logs da execução.

O renderizador verifica que os GIFs têm mais de um quadro, loop infinito,
resolução esperada e tamanho inferior a 10 MiB por arquivo. Confira também
a reprodução dos três GIFs e sua legibilidade no README.
