#!/bin/bash

# QR Generator SaaS - Startup Script
# This script starts the complete SaaS application

set -e

echo "🚀 Starting QR Generator SaaS Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi

    print_success "Docker is installed and running"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi

    print_success "Node.js $(node -v) is installed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Root dependencies
    if [ -f "package.json" ]; then
        npm install --silent
    fi

    # Backend dependencies
    if [ -d "backend" ] && [ -f "backend/package.json" ]; then
        cd backend
        npm install --silent
        cd ..
    fi

    # Frontend dependencies
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        cd frontend
        npm install --silent
        cd ..
    fi

    print_success "Dependencies installed"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."

    # Backend environment
    if [ ! -f "backend/.env" ]; then
        if [ -f "backend/.env.example" ]; then
            cp backend/.env.example backend/.env
            print_warning "Created backend/.env from example. Please update with your values."
        else
            print_warning "No backend/.env.example found. Please create backend/.env manually."
        fi
    fi

    # Frontend environment
    if [ ! -f "frontend/.env.local" ]; then
        cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
EOF
        print_warning "Created frontend/.env.local with default values. Please update if needed."
    fi

    print_success "Environment files ready"
}

# Start databases with Docker
start_databases() {
    print_status "Starting databases with Docker..."

    if [ -f "docker-compose.yml" ]; then
        # Start only database services
        docker-compose up -d postgres redis
        
        # Wait for databases to be ready
        print_status "Waiting for databases to be ready..."
        sleep 10
        
        print_success "Databases started successfully"
    else
        print_warning "No docker-compose.yml found. Please start PostgreSQL and Redis manually."
    fi
}

# Setup database
setup_database() {
    print_status "Setting up database..."

    if [ -d "backend" ]; then
        cd backend
        
        # Generate Prisma client
        if command -v npx &> /dev/null; then
            npx prisma generate
            
            # Run migrations
            npx prisma migrate dev --name init
            
            print_success "Database setup completed"
        else
            print_error "npx not found. Please install Node.js properly."
            exit 1
        fi
        
        cd ..
    fi
}

# Start the application
start_application() {
    print_status "Starting the application..."

    # Check if we can use the root npm script
    if [ -f "package.json" ] && grep -q "\"dev\"" package.json; then
        print_status "Starting both frontend and backend..."
        npm run dev
    else
        print_status "Starting services individually..."
        
        # Start backend in background
        if [ -d "backend" ]; then
            cd backend
            npm run dev &
            BACKEND_PID=$!
            cd ..
            print_success "Backend started (PID: $BACKEND_PID)"
        fi

        # Start frontend in background
        if [ -d "frontend" ]; then
            cd frontend
            npm run dev &
            FRONTEND_PID=$!
            cd ..
            print_success "Frontend started (PID: $FRONTEND_PID)"
        fi

        # Wait for user to stop
        print_success "Application is running!"
        print_status "Frontend: http://localhost:3000"
        print_status "Backend API: http://localhost:3001"
        print_status "Press Ctrl+C to stop all services"

        # Handle cleanup on exit
        trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; docker-compose down; exit' INT TERM

        # Wait indefinitely
        wait
    fi
}

# Main execution
main() {
    echo "========================================"
    echo "  QR Generator SaaS - Startup Script"
    echo "========================================"
    echo ""

    # Parse command line arguments
    SKIP_DEPS=false
    SKIP_DB=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --skip-db)
                SKIP_DB=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --skip-deps    Skip dependency installation"
                echo "  --skip-db      Skip database setup"
                echo "  --help, -h     Show this help message"
                echo ""
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done

    # Run startup sequence
    check_docker
    check_node

    if [ "$SKIP_DEPS" = false ]; then
        install_dependencies
    fi

    setup_environment

    if [ "$SKIP_DB" = false ]; then
        start_databases
        setup_database
    fi

    print_success "🎉 Setup completed successfully!"
    echo ""
    print_status "Starting the QR Generator SaaS application..."
    print_status "Frontend will be available at: http://localhost:3000"
    print_status "Backend API will be available at: http://localhost:3001"
    echo ""

    start_application
}

# Run main function
main "$@"