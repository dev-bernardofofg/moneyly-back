# Deploy no Netlify - Configuração

## Variáveis de Ambiente Necessárias

Configure as seguintes variáveis de ambiente no painel do Netlify:

### Obrigatórias:

- `DATABASE_URL`: URL de conexão com o banco de dados PostgreSQL
- `JWT_SECRET`: Chave secreta para assinatura de tokens JWT

### Opcionais:

- `JWT_EXPIRES_IN`: Tempo de expiração do token (padrão: "7d")
- `GOOGLE_CLIENT_ID`: ID do cliente Google OAuth
- `GOOGLE_CLIENT_SECRET`: Secret do cliente Google OAuth
- `ALLOWED_ORIGINS`: Lista de origens permitidas (separadas por vírgula)
- `RATE_LIMIT_WINDOW_MS`: Janela de tempo para rate limiting (padrão: 900000ms = 15min)
- `RATE_LIMIT_MAX`: Máximo de requisições por janela (padrão: 100)
- `REQUEST_TIMEOUT`: Timeout das requisições (padrão: 30000ms = 30s)

## Como Configurar:

1. Acesse o painel do Netlify
2. Vá para seu site
3. Clique em "Site settings"
4. Vá para "Environment variables"
5. Adicione cada variável com seu respectivo valor

## Exemplo de Configuração:

```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=sua-chave-secreta-muito-segura
GOOGLE_CLIENT_ID=seu-google-client-id
GOOGLE_CLIENT_SECRET=seu-google-client-secret
ALLOWED_ORIGINS=https://seu-frontend.com,https://localhost:3000
```

## Problemas Comuns:

### Erro "Cannot convert undefined or null to object"

- **Causa**: Middleware de segurança tentando remover headers que não existem
- **Solução**: Já corrigido no código atual usando `netlifySecurityMiddleware`

### Erro de CORS

- **Causa**: Frontend não está na lista de origens permitidas
- **Solução**: Adicione o domínio do frontend em `ALLOWED_ORIGINS`

### Erro de conexão com banco de dados

- **Causa**: `DATABASE_URL` não configurada ou inválida
- **Solução**: Verifique se a URL está correta e se o banco está acessível

## Testando o Deploy:

Após o deploy, teste os endpoints:

```bash
# Teste básico
curl https://seu-site.netlify.app/api/health

# Teste de autenticação
curl -X POST https://seu-site.netlify.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

## Logs e Debug:

Para ver os logs do deploy:

1. Vá para "Functions" no painel do Netlify
2. Clique na função "api"
3. Veja os logs em tempo real

## Estrutura de Arquivos:

```
netlify/
├── functions/
│   └── api.ts          # Função principal do Netlify
└── netlify.toml        # Configuração do deploy
```

## Comandos Úteis:

```bash
# Build local
npm run build

# Teste local da função
netlify dev

# Deploy manual
netlify deploy --prod
```
