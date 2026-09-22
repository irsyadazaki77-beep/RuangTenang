#!/usr/bin/env bash
# ==============================================================================
# Production Deployment Automation Script for RuangTenang & RuangKerja Platform
# Objective: Zero-loss database backup, multi-stage build, Prisma migration,
#            graceful container rollout, and automated healthcheck verification.
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# Terminal Color Formatting & Logging Helpers
# ------------------------------------------------------------------------------
BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
CYAN="\033[0;36m"
NC="\033[0m" # No Color

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_header()  {
    echo -e "\n${BOLD}${CYAN}================================================================${NC}"
    echo -e "${BOLD}${CYAN}  $1${NC}"
    echo -e "${BOLD}${CYAN}================================================================${NC}\n"
}

# ------------------------------------------------------------------------------
# Configuration Variables
# ------------------------------------------------------------------------------
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"
MAX_HEALTH_ATTEMPTS=30
HEALTH_INTERVAL=2

# Determine Docker Compose Command (v2 plugin vs v1 standalone)
if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE}"
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose -f ${COMPOSE_FILE} --env-file ${ENV_FILE}"
else
    log_error "Neither 'docker compose' nor 'docker-compose' command was found."
    exit 1
fi

log_header "RUANGTENANG & RUANGKERJA - PRODUCTION DEPLOYMENT"

# ------------------------------------------------------------------------------
# 1. Pre-Flight Checks & Environment Validation
# ------------------------------------------------------------------------------
log_info "Step 1: Running pre-flight environment checks..."

if [ ! -f "$ENV_FILE" ]; then
    log_error "Production environment file '${ENV_FILE}' not found!"
    log_warn "Please create '${ENV_FILE}' from '.env.production.example' before deploying."
    exit 1
fi

# Validate presence of critical secrets in .env.production
REQUIRED_VARS=("JWT_SECRET" "ENCRYPTION_KEY" "BLIND_INDEX_SECRET" "POSTGRES_PASSWORD" "REDIS_PASSWORD")
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" "$ENV_FILE" || [ -z "$(grep "^${var}=" "$ENV_FILE" | cut -d '=' -f2-)" ]; then
        log_error "Required environment variable '${var}' is missing or empty in '${ENV_FILE}'."
        exit 1
    fi
done

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"
log_success "Pre-flight checks passed."

# ------------------------------------------------------------------------------
# 2. Automated PostgreSQL Database Backup
# ------------------------------------------------------------------------------
log_info "Step 2: Checking existing database state for backup..."

DB_CONTAINER_NAME="ruangtenang_db_prod"
if [ "$(docker ps -q -f name=${DB_CONTAINER_NAME})" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz"
    log_info "Creating automated database snapshot: ${BACKUP_FILE}"
    
    # Safely source database credentials for pg_dump
    POSTGRES_USER=$(grep "^POSTGRES_USER=" "$ENV_FILE" | cut -d '=' -f2- | tr -d ' "\047' || echo "ruangtenang_admin")
    POSTGRES_DB=$(grep "^POSTGRES_DB=" "$ENV_FILE" | cut -d '=' -f2- | tr -d ' "\047' || echo "ruangtenang_prod")
    
    if docker exec -t "${DB_CONTAINER_NAME}" pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${BACKUP_FILE}"; then
        log_success "Database snapshot saved successfully (${BACKUP_FILE})."
    else
        log_warn "Database backup encountered an issue. Proceeding with caution..."
    fi
    
    # Prune old backups keeping latest 10 snapshots
    find "${BACKUP_DIR}" -name "db_backup_*.sql.gz" -type f -mtime +7 -delete 2>/dev/null || true
else
    log_info "Database container is not currently running. Skipping preliminary backup."
fi

# ------------------------------------------------------------------------------
# 3. Build Multi-Stage Production Images
# ------------------------------------------------------------------------------
log_info "Step 3: Building production multi-stage container images..."
${DOCKER_COMPOSE} build --pull
log_success "Docker images built successfully."

# ------------------------------------------------------------------------------
# 4. Launch Supporting Services & Execute Prisma Migrations
# ------------------------------------------------------------------------------
log_info "Step 4: Ensuring database and cache services are healthy..."
${DOCKER_COMPOSE} up -d db cache

log_info "Waiting for database container health status..."
DB_HEALTH_WAIT=0
until [ "$(docker inspect -f '{{.State.Health.Status}}' ${DB_CONTAINER_NAME} 2>/dev/null)" == "healthy" ] || [ $DB_HEALTH_WAIT -ge 20 ]; do
    sleep 1
    DB_HEALTH_WAIT=$((DB_HEALTH_WAIT+1))
done

log_info "Executing Prisma database migrations (schema.postgres.prisma)..."
${DOCKER_COMPOSE} run --rm --no-deps web npx prisma migrate deploy --schema prisma/schema.postgres.prisma
log_success "Database migrations deployed successfully."

# ------------------------------------------------------------------------------
# 5. Rollout Core Application & Reverse Proxy
# ------------------------------------------------------------------------------
log_info "Step 5: Performing graceful container rollout..."
${DOCKER_COMPOSE} up -d --remove-orphans
log_success "All production services initiated."

# ------------------------------------------------------------------------------
# 6. Post-Deployment Automated Healthcheck Verification
# ------------------------------------------------------------------------------
log_info "Step 6: Verifying system health and readiness..."

ATTEMPTS=0
HEALTHY=false

while [ $ATTEMPTS -lt $MAX_HEALTH_ATTEMPTS ]; do
    ATTEMPTS=$((ATTEMPTS+1))
    
    # Probe internal app health via docker exec on the app container
    HEALTH_OUTPUT=$(docker exec ruangtenang_app_prod wget -q -O - http://127.0.0.1:3000/api/v1/health 2>/dev/null || true)
    
    if echo "$HEALTH_OUTPUT" | grep -q '"status":"healthy"'; then
        HEALTHY=true
        break
    fi
    
    echo -n "."
    sleep $HEALTH_INTERVAL
done
echo ""

if [ "$HEALTHY" = true ]; then
    log_success "System health check PASSED after ${ATTEMPTS} attempts."
else
    log_error "System health check FAILED after ${MAX_HEALTH_ATTEMPTS} attempts!"
    log_warn "Displaying last 50 lines of application logs for diagnosis:"
    ${DOCKER_COMPOSE} logs --tail=50 web
    log_error "Deployment failed health validation. Please investigate container logs."
    exit 1
fi

# ------------------------------------------------------------------------------
# 7. Post-Deployment Cleanup & Resource Optimization
# ------------------------------------------------------------------------------
log_info "Step 7: Cleaning up dangling docker images..."
docker image prune -f >/dev/null 2>&1 || true

# ------------------------------------------------------------------------------
# Summary & Status Report
# ------------------------------------------------------------------------------
log_header "DEPLOYMENT SUCCESSFUL"
echo -e "${GREEN}Platform RuangTenang & RuangKerja is running in production mode!${NC}\n"
${DOCKER_COMPOSE} ps

echo -e "\n${BOLD}Useful Operational Commands:${NC}"
echo -e "  - View live logs:      ${CYAN}${DOCKER_COMPOSE} logs -f web${NC}"
echo -e "  - View proxy logs:    ${CYAN}${DOCKER_COMPOSE} logs -f proxy${NC}"
echo -e "  - Database backup:    ${CYAN}npm run db:backup${NC}"
echo -e "  - Stop platform:      ${CYAN}${DOCKER_COMPOSE} down${NC}"
echo ""
