# 🛴 Sistema de Gerenciamento de Patinetes

Sistema de gerenciamento de patinetes elétricos com funcionalidades de desbloqueio temporizado, rastreamento em tempo real e comunicação via WebSocket.

## 📋 Funcionalidades

- **Gerenciamento de Patinetes**: CRUD completo para patinetes elétricos
- **Sistema de Desbloqueio**: Desbloqueio temporizado com timeout automático de 3 minutos
- **Comunicação em Tempo Real**: WebSocket e Socket.IO para atualizações instantâneas
- **Banco de Dados**: Persistência com PostgreSQL usando Prisma ORM
- **API REST**: Interface completa para integração com aplicações cliente
- **Arquitetura Modular**: Organizado em camadas (Repository, Service, Controller)

## 🚀 Tecnologias Utilizadas

### Backend

- **Node.js** - Runtime JavaScript
- **TypeScript** - Superset tipado do JavaScript
- **Express.js** - Framework web minimalista
- **Prisma** - ORM moderno para TypeScript/JavaScript
- **PostgreSQL** - Banco de dados relacional

### Comunicação

- **Socket.IO** - Comunicação em tempo real
- **WebSocket** - Protocolo de comunicação bidirecional

### Ferramentas

- **dotenv** - Gerenciamento de variáveis de ambiente

## 📦 Estrutura do Projeto

```
src/
├── app.ts                     # Configuração principal da aplicação
├── server.ts                  # Servidor HTTP
├── controllers/               # Controllers da API
│   └── scooterController.ts   # Controladores de patinetes
├── services/                  # Lógica de negócio
│   ├── scooterService.ts      # Regras de negócio dos patinetes
│   ├── webSocketService.ts    # Gerenciamento de WebSockets
│   └── database.ts            # Conexão com banco de dados
├── repositories/              # Acesso a dados
│   ├── scooterRepository.ts   # Operações de banco para patinetes
│   └── unlockAttemptRepository.ts # Operações de tentativas de desbloqueio
├── routes/                    # Definição de rotas
│   └── scooterRoutes.ts       # Rotas dos patinetes
├── types/                     # Definições de tipos TypeScript
│   ├── scooter.d.ts           # Tipos relacionados a patinetes
│   └── api.d.ts               # Tipos de API e WebSocket
├── utils/                     # Utilitários
│   └── scooter.ts             # Validações e funções auxiliares
├── websocket/                 # Configuração WebSocket
│   └── setup.ts               # Setup dos WebSockets
├── lib/                       # Bibliotecas e configurações
│   ├── express.ts             # Configuração do Express
│   └── prisma.ts              # Cliente Prisma
└── config/                    # Configurações
    └── env.ts                 # Variáveis de ambiente

prisma/
├── schema.prisma              # Schema do banco de dados
└── migrations/                # Migrações do banco
```

## 🛠️ Instalação e Configuração

### Pré-requisitos

- Node.js 18+
- PostgreSQL
- npm ou yarn

### Passos para Instalação

1. **Clone o repositório**

   ```bash
   git clone https://github.com/SrRobert0/scooter-ws
   cd scooter-ws
   ```

2. **Instale as dependências**

   ```bash
   npm install
   ```

3. **Configure as variáveis de ambiente**

   Crie um arquivo `.env` na raiz do projeto:

   ```env
   PORT=3000
   DATABASE_URL="postgresql://username:password@localhost:5432/scooters"
   ```

4. **Configure o banco de dados**

   ```bash
   # Gere o cliente Prisma
   npx prisma generate

   # Execute as migrações
   npx prisma migrate dev
   ```

5. **Inicie o servidor**

   ```bash
   # Desenvolvimento
   npm run dev

   # Produção
   npm run build
   npm start
   ```

## 🔌 API Endpoints

### Status do Servidor

| Método | Endpoint  | Descrição                               |
| ------ | --------- | --------------------------------------- |
| `GET`  | `/status` | Verifica se o servidor está funcionando |

### Gerenciamento de Patinetes

| Método   | Endpoint                      | Descrição                        |
| -------- | ----------------------------- | -------------------------------- |
| `GET`    | `/scooters`                   | Lista todos os patinetes         |
| `GET`    | `/scooters/:id`               | Busca patinete específico por ID |
| `GET`    | `/scooters/:id/unlock-status` | Verifica status de desbloqueio   |
| `POST`   | `/scooters/register`          | Registra novo patinete           |
| `PUT`    | `/scooters/:id`               | Atualiza dados do patinete       |
| `DELETE` | `/scooters/:id`               | Remove patinete                  |

### Sistema de Desbloqueio

| Método | Endpoint                         | Descrição                      |
| ------ | -------------------------------- | ------------------------------ |
| `POST` | `/scooters/:id/unlock/:deviceId` | Inicia processo de desbloqueio |
| `POST` | `/scooters/:id/ride`             | Confirma início do passeio     |
| `POST` | `/scooters/:id/lock`             | Bloqueia patinete              |

## 📝 Exemplos de Uso da API

### Registrar um patinete

```bash
curl -X POST http://localhost:3000/scooters/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Patinete Azul",
    "batteryLevel": 85,
    "lat": -23.5505,
    "lon": -46.6333,
    "displacement": 1250.5
  }'
```

**Resposta:**

```json
{
  "id": "cm123abc456",
  "name": "Patinete Azul",
  "batteryLevel": 85,
  "lat": -23.5505,
  "lon": -46.6333,
  "displacement": 1250.5,
  "onUse": false,
  "lastUpdate": "2025-11-16T10:30:00.000Z"
}
```

### Listar todos os patinetes

```bash
curl http://localhost:3000/scooters
```

### Iniciar desbloqueio

```bash
curl -X POST http://localhost:3000/scooters/cm123abc456/unlock/device789
```

**Resposta:**

```json
{
  "message": "Patinete Azul: Iniciando processo de desbloqueio",
  "autoUnlockIn": "3 minutos"
}
```

### Confirmar início do passeio

```bash
curl -X POST http://localhost:3000/scooters/cm123abc456/ride
```

### Bloquear patinete

```bash
curl -X POST http://localhost:3000/scooters/cm123abc456/lock
```

## 🔄 Fluxo de Uso do Sistema

### 1. Registro de Patinete

- Cliente registra um novo patinete no sistema
- Sistema atribui ID único e status inicial

### 2. Processo de Desbloqueio

1. **Solicitação**: Cliente solicita desbloqueio informando ID do patinete e device
2. **Verificação**: Sistema verifica se patinete está disponível
3. **Timer**: Inicia timer de 3 minutos para desbloqueio automático
4. **Notificação**: Clientes conectados via WebSocket são notificados

### 3. Confirmação de Uso

- Cliente confirma início do passeio
- Timer é cancelado
- Patinete fica marcado como "em uso"

### 4. Finalização

- Cliente bloqueia patinete após uso
- Sistema atualiza status para disponível
- Histórico de tentativas é mantido no banco

### 5. Timeout Automático

- Se não houver confirmação em 3 minutos
- Sistema automaticamente libera o patinete
- Clientes são notificados da liberação

## 📡 Eventos WebSocket em Tempo Real

### Eventos Disponíveis

- `scooter_creation` - Novo patinete registrado
- `scooter_update` - Patinete atualizado
- `scooter_delete` - Patinete removido
- `scooter_unlocking` - Processo de desbloqueio iniciado
- `scooter_ride` - Passeio confirmado
- `scooter_lock` - Patinete bloqueado

### Conexão WebSocket Nativo

```javascript
const ws = new WebSocket("ws://localhost:3000");

ws.onopen = () => {
  console.log("Conectado ao WebSocket");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Evento recebido:", data.action, data);
};
```

### Conexão Socket.IO

```javascript
const socket = io("http://localhost:3000");

// Escutar eventos gerais
socket.on("scooter_update", (data) => {
  console.log("Patinete atualizado:", data);
});

// Escutar eventos específicos de um patinete
socket.on("scooter_unlocking_cm123abc456", (data) => {
  console.log("Patinete específico sendo desbloqueado:", data);
});
```

## 🗃️ Modelos de Dados

### Scooter (Patinete)

```typescript
interface Scooter {
  id: string; // Identificador único
  name: string; // Nome do patinete
  batteryLevel: number; // Nível da bateria (0-100)
  lat: number; // Latitude
  lon: number; // Longitude
  displacement: number; // Deslocamento total
  onUse: boolean; // Em uso ou disponível
  lastUpdate: Date; // Última atualização
  unlockAttempt?: {
    // Tentativa ativa (opcional)
    deviceId: string;
    timestamp: Date;
    timerId?: NodeJS.Timeout;
  };
}
```

### Banco de Dados - Schema Prisma

#### Tabela Scooters

```prisma
model Scooter {
  id           String   @id @default(cuid())
  name         String
  batteryLevel Int      @map("battery_level")
  lat          Float
  lon          Float
  displacement Float
  onUse        Boolean  @default(false) @map("on_use")
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  unlockAttempts UnlockAttempt[]
  @@map("scooters")
}
```

#### Tabela UnlockAttempts

```prisma
model UnlockAttempt {
  id        String   @id @default(cuid())
  scooterId String   @map("scooter_id")
  deviceId  String   @map("device_id")
  timestamp DateTime @default(now())
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  scooter Scooter @relation(fields: [scooterId], references: [id], onDelete: Cascade)
  @@map("unlock_attempts")
}
```

## 🏗️ Arquitetura e Padrões

### Camadas da Aplicação

#### 1. **Controllers** (`src/controllers/`)

- Gerenciam requisições HTTP
- Validam entrada
- Formatam respostas
- Delegam lógica para Services

#### 2. **Services** (`src/services/`)

- Contêm lógica de negócio
- Coordenam operações entre Repositories
- Gerenciam timers e estados em memória
- Emitem eventos WebSocket

#### 3. **Repositories** (`src/repositories/`)

- Abstraem acesso ao banco de dados
- Operações CRUD puras
- Mapeiam dados entre Prisma e tipos da aplicação

#### 4. **WebSocket Services** (`src/websocket/`)

- Gerenciam conexões em tempo real
- Distribuem eventos para clientes conectados

### Padrões Utilizados

- **Repository Pattern**: Separação entre lógica de negócio e acesso a dados
- **Service Layer**: Centralização de regras de negócio
- **Functional Programming**: Uso de funções puras, evitando classes
- **Observer Pattern**: Sistema de eventos WebSocket
- **Dependency Injection**: Injeção de dependências entre camadas

## 🔒 Validações e Segurança

### Validações de Entrada

- **Nome do patinete**: Obrigatório, tipo string
- **Nível de bateria**: 0-100, tipo numérico
- **Coordenadas**: Latitude/longitude válidas
- **IDs**: Formato UUID válido

### Validações de Negócio

- Patinete deve existir para operações
- Não permitir desbloqueio se já em uso
- Verificar device ID em tentativas de desbloqueio
- Controlar estados válidos de transição

### Sanitização

- Remoção de propriedades não serializáveis (timers)
- Prevenção de vazamento de dados sensíveis
- Validação de tipos TypeScript

## 🚦 Estados dos Patinetes

### Estados Possíveis

1. **Disponível**

   - `onUse: false`
   - Sem tentativas ativas
   - Pronto para desbloqueio

2. **Em Processo de Desbloqueio**

   - `onUse: true`
   - `unlockAttempt` ativo
   - Timer de 3 minutos rodando

3. **Em Uso**
   - `onUse: true`
   - Sem `unlockAttempt` ativo
   - Passeio confirmado

### Transições de Estado

```
Disponível → [unlock] → Em Desbloqueio
Em Desbloqueio → [ride] → Em Uso
Em Desbloqueio → [timeout] → Disponível
Em Uso → [lock] → Disponível
```

## 📊 Logs e Monitoramento

### Tipos de Log

- Operações de patinetes (criação, atualização, remoção)
- Tentativas de desbloqueio
- Timeouts automáticos
- Conexões WebSocket
- Erros de banco de dados

### Exemplo de Logs

```
Novo patinete registrado: cm123abc456
Iniciando processo de desbloqueio para patinete: cm123abc456 - Timer de 3 minutos ativado
Desbloqueio automático executado para patinete: cm123abc456
WS puro desconectado
```

## 🧪 Scripts de Desenvolvimento

```bash
# Desenvolvimento
npm run dev          # Inicia servidor com hot-reload

# Build e produção
npm run build        # Compila TypeScript
npm start           # Inicia servidor produção

# Banco de dados
npx prisma migrate dev    # Nova migração
npx prisma generate      # Gera cliente Prisma
npx prisma studio       # Interface visual do banco
npx prisma db push      # Sincroniza schema sem migração
```

## 🔧 Variáveis de Ambiente

```env
# Servidor
PORT=3000

# Banco de Dados
DATABASE_URL="postgresql://username:password@localhost:5432/scooters"
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 🎯 Funcionalidades Futuras

- [ ] Autenticação e autorização
- [ ] Histórico de viagens
- [ ] Geofencing
- [ ] Integração com mapas
- [ ] Dashboard administrativo
- [ ] API de pagamentos
- [ ] Notificações push
- [ ] Analytics e relatórios
