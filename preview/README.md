# Previews do Library Manager

GIFs feitos com **capturas reais do projeto executado localmente**, sem hospedagem,
sem respostas de API simuladas e sem alterações no código ou no estilo da aplicação.
Moldura, legendas, cursor destacado e transições são elementos editoriais.

| Arquivo | Conteúdo | Duração aproximada | Tamanho |
| --- | --- | --- | --- |
| [library-manager-demo.gif](./library-manager-demo.gif) | Visão geral das seis etapas | 26 s | 1,33 MiB |
| [library-manager-admin.gif](./library-manager-admin.gif) | Edição de livros e quantidade de exemplares | 13 s | 0,32 MiB |
| [library-manager-catalogo.gif](./library-manager-catalogo.gif) | Ficha do leitor, bibliotecas e histórico | 12 s | 0,24 MiB |

Todos têm resolução de **1280 × 1000**, legendas em português e reprodução em loop.
A ilustração original `domestic-life-illustrated.jpg` foi preservada.

## O que a demonstração comprova

1. A página inicial e a tela de acesso renderizam no navegador.
2. O login de operador é validado pela API Express conectada a um PostgreSQL 16 real.
3. Os campos do livro podem ser editados na interface administrativa.
4. Os controles da tela de biblioteca alteram a quantidade de 10 para 12.
5. O pop-up de bibliotecas abre e fecha.
6. O histórico exibe seus dados de exemplo.

### Limitações que não foram ocultadas

- Os livros administrativos, a ficha do leitor, as bibliotecas e o histórico
  exibidos são exemplos definidos nos componentes React.
- As edições de livros e estoque ficam no estado local da interface; não são
  demonstrações de gravação no banco.
- `/library`, `/user` e `/loan` são abertos diretamente durante a captura.
  Os botões correspondentes de navegação ainda não executam essas mudanças de rota.
- A tela de biblioteca possui campos com texto branco sobre fundo branco.
  A gravação preserva esse estilo; na última etapa, o valor é selecionado com o
  recurso nativo do navegador para ficar legível.
- Os formulários de cadastro de livros e vinculação à biblioteca, o botão de
  aluguel e os relatórios não são apresentados como fluxos completos.
- O nome “Obi Wan Kenobi” e os demais exemplos vêm da interface original.
  Nenhuma informação pessoal foi preenchida para a gravação.

## Como recriar os GIFs

### Requisitos

- Node.js 20 ou superior, npm e Python 3.
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

- cria um cluster PostgreSQL 16 isolado em um diretório temporário;
- importa `backend/database/init.sql` pelo protocolo COPY, preservando os dados;
- escolhe portas locais livres e credenciais temporárias;
- inicia o backend e o Vite, restritos a `127.0.0.1`;
- usa o login de demonstração `admin/admin` sem gravar a senha em texto visível;
- registra capturas e verifica os resultados das interações;
- encerra os serviços e descarta o banco temporário após a captura.

Os bancos e volumes existentes não são acessados. A pasta temporária usa
`/tmp/opencode` quando disponível, ou o diretório temporário do sistema.
Para escolher outro diretório existente, defina `PREVIEW_TMP`.

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

- `review.jpg`: painel com as seis seções para inspeção visual.
- `scenes.json`: ordem, duração, legendas e posições do cursor.
- `validation.json`: verificações de navegação, login e interações.
- `render-validation.json`: tamanho, resolução e duração dos GIFs.
- `backend.log` e `frontend.log`: logs da execução.

O renderizador verifica que os GIFs têm mais de um quadro, loop infinito,
resolução esperada e tamanho inferior a 10 MiB por arquivo. Confira também
a reprodução dos três GIFs e sua legibilidade no README.
