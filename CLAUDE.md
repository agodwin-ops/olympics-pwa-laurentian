# Claudable Project Guide

## Overview
Claudable is a powerful Next.js-based web app builder that combines Claude Code's advanced AI agent capabilities with Lovable's intuitive app building experience. It enables users to build and deploy professional web applications using natural language descriptions.

## Project Structure
```
/home/agodwin/Claudable/Claudable/
├── apps/
│   ├── api/                    # FastAPI backend server
│   │   ├── app/
│   │   │   ├── api/           # API endpoints and routes
│   │   │   ├── core/          # Core functionality (config, crypto, logging)
│   │   │   ├── db/            # Database configuration and session management
│   │   │   ├── models/        # SQLAlchemy data models
│   │   │   ├── services/      # Business logic and external integrations
│   │   │   └── main.py        # FastAPI application entry point
│   │   └── requirements.txt   # Python dependencies
│   └── web/                   # Next.js frontend application
│       ├── app/               # Next.js 13+ app router pages
│       ├── components/        # React components
│       ├── contexts/          # React contexts
│       ├── hooks/             # Custom React hooks
│       ├── lib/               # Utility libraries
│       ├── public/            # Static assets
│       └── package.json       # Node.js dependencies
├── assets/                    # Project assets and media
├── data/                      # Database files (SQLite)
├── scripts/                   # Setup and utility scripts
└── package.json              # Root package configuration
```

## Technology Stack

### Frontend (Next.js)
- **Framework**: Next.js 14.2.5 with App Router
- **Language**: TypeScript 5.9.2
- **Styling**: Tailwind CSS 3.4.10
- **UI Components**: Lucide React icons, shadcn/ui patterns
- **Animation**: Framer Motion 11.3.31
- **Code Highlighting**: React Syntax Highlighter with Highlight.js

### Backend (FastAPI)
- **Framework**: FastAPI >=0.112
- **Server**: Uvicorn with standard extras
- **Database**: SQLAlchemy 2.0+ (SQLite for dev, PostgreSQL for production)
- **Authentication**: Cryptography 42.0+
- **AI Integration**: Claude Code SDK >=0.0.20, OpenAI 1.40+
- **Additional**: WebSockets, Docker support, Rich CLI

### External Integrations
- **AI Agents**: Claude Code, Cursor CLI
- **Deployment**: Vercel
- **Database**: Supabase (PostgreSQL)
- **Version Control**: GitHub

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- Claude Code or Cursor CLI (logged in)
- Git

### Installation & Setup
```bash
# Clone and navigate to project
git clone https://github.com/opactorai/Claudable.git
cd Claudable

# Install all dependencies (auto-setup)
npm install

# Start development servers
npm run dev
```

The `npm install` command automatically:
1. Detects available ports and creates `.env` files
2. Installs Node.js dependencies including workspace packages
3. Creates Python virtual environment at `apps/api/.venv`
4. Installs Python dependencies using pip
5. Initializes SQLite database at `data/cc.db`

### Manual Setup (Alternative)
```bash
# Frontend setup
cd apps/web
npm install

# Backend setup
cd ../api
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Development

### Available Scripts

#### Root Level
```bash
npm run dev          # Start both API and web servers concurrently
npm run dev:api      # Start only the FastAPI backend
npm run dev:web      # Start only the Next.js frontend
npm run setup        # Alias for npm install
npm run clean        # Remove all dependencies and virtual environments
npm run db:reset     # Reset database to initial state (destructive)
npm run db:backup    # Create timestamped database backup
```

#### Frontend (apps/web/)
```bash
npm run dev          # Start development server with auto-open
npm run dev:no-open  # Start development server without opening browser
npm run build        # Build for production
npm run start        # Start production server
```

### Default Ports
- **Frontend**: http://localhost:3000
- **API Server**: http://localhost:8080
- **API Documentation**: http://localhost:8080/docs

*Note: If default ports are in use, the system auto-detects available ports*

### Database Management
- **Development**: SQLite database at `data/cc.db`
- **Production**: PostgreSQL via Supabase integration
- **Backups**: Stored in `data/backups/` with timestamps
- **Schema**: Auto-migrates via SQLAlchemy models

### Code Style & Standards
- **Python**: Follow PEP 8 guidelines, use type hints
- **TypeScript**: Strict TypeScript configuration
- **React**: Functional components with hooks, proper prop typing
- **Styling**: Tailwind CSS utility classes, consistent design patterns
- **API**: RESTful endpoints with proper HTTP methods and status codes

## Key Features Implementation

### AI Agent Integration
- Claude Code SDK integration at `apps/api/app/services/claude_act.py`
- Cursor CLI support via unified manager at `apps/api/app/services/cli/unified_manager.py`
- WebSocket communication for real-time AI interactions

### Project Management
- Project CRUD operations at `apps/api/app/api/projects/`
- Template-based project initialization
- GitHub repository integration and management

### Service Integrations
- **GitHub**: Token-based API integration for repository management
- **Vercel**: Deployment automation and project synchronization
- **Supabase**: Database connection and authentication setup

### Chat Interface
- Real-time chat with AI agents via WebSocket
- Message history persistence
- Tool result visualization and code highlighting

## Troubleshooting

### Common Issues

#### Port Conflicts
Check `.env` files for auto-assigned ports when defaults are unavailable.

#### Installation Failures
```bash
npm run clean
npm install
```

#### Permission Errors (macOS/Linux)
```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

#### Claude Code Permissions (Windows/WSL)
```bash
# Don't run as root/sudo
whoami
sudo chown -R $(whoami):$(whoami) ~/Claudable
npm install -g @anthropic-ai/claude-code --unsafe-perm=false
```

### Service Integration Setup

#### GitHub Integration
1. Generate token at [GitHub Personal Access Tokens](https://github.com/settings/tokens)
2. Select `repo` scope
3. Connect via Settings → Service Integrations → GitHub

#### Vercel Integration
1. Create token at [Vercel Account Settings](https://vercel.com/account/tokens)
2. Connect via Settings → Service Integrations → Vercel

#### Supabase Integration
1. Get credentials from [Supabase Dashboard](https://supabase.com/dashboard)
2. Configure Project URL, Anon Key, and Service Role Key
3. Connect via Settings → Service Integrations → Supabase

## API Documentation

Access interactive API documentation at http://localhost:8080/docs when the backend is running.

### Key API Endpoints
- `/api/projects/` - Project management
- `/api/chat/` - Chat functionality
- `/api/github/` - GitHub integration
- `/api/vercel/` - Vercel deployment
- `/ws/chat` - WebSocket chat endpoint

## Architecture Notes

### Monorepo Structure
- Root-level workspace configuration manages both frontend and backend
- Shared scripts handle cross-service operations
- Environment configuration automatically synchronized

### Database Design
- SQLAlchemy models define schema at `apps/api/app/models/`
- Automatic migrations and table creation
- Session management with proper connection pooling

### Security Considerations
- Environment-based configuration for sensitive data
- Cryptographic utilities for secure operations
- Proper authentication flow for external services

## Next Steps

1. **Development**: Use natural language to describe features via the chat interface
2. **Testing**: Implement unit tests for both frontend and backend components
3. **Deployment**: Connect GitHub and Vercel for automated deployment pipeline
4. **Database**: Configure Supabase for production data persistence
5. **Monitoring**: Add logging and error tracking for production use

For detailed usage instructions and feature demonstrations, refer to the main [README.md](./README.md).