#!/bin/bash

# Folder Structure Migration Script for cloudtodo
# This script creates the new folder structure

set -e

echo "Creating new folder structure..."

# Create app directory structure
mkdir -p src/app/providers
mkdir -p src/app/routes

# Create features directory structure
mkdir -p src/features/auth/components
mkdir -p src/features/auth/hooks
mkdir -p src/features/auth/store

mkdir -p src/features/tasks/components
mkdir -p src/features/tasks/hooks
mkdir -p src/features/tasks/store
mkdir -p src/features/tasks/services
mkdir -p src/features/tasks/types

mkdir -p src/features/kanban/components

mkdir -p src/features/calendar/components

mkdir -p src/features/collaboration/components

mkdir -p src/features/ai/components
mkdir -p src/features/ai/services

mkdir -p src/features/notifications/services
mkdir -p src/features/notifications/store

mkdir -p src/features/settings/components
mkdir -p src/features/settings/store

mkdir -p src/features/projects/store

# Create shared directory structure
mkdir -p src/shared/components/layout
mkdir -p src/shared/components/ui
mkdir -p src/shared/hooks
mkdir -p src/shared/contexts
mkdir -p src/shared/types
mkdir -p src/shared/utils

# Create services directory structure
mkdir -p src/services/api
mkdir -p src/services/storage
mkdir -p src/services/socket
mkdir -p src/services/error
mkdir -p src/services/monitoring

# Create pages directory structure
mkdir -p src/pages/landing
mkdir -p src/pages/documentation
mkdir -p src/pages/api-reference
mkdir -p src/pages/legal

# Create config directory
mkdir -p src/config

# Create styles directory
mkdir -p src/styles/themes

# Create server directory structure
mkdir -p server/services/google-drive
mkdir -p server/services/notifications
mkdir -p server/routes
mkdir -p server/middleware
mkdir -p server/config

echo "✓ Folder structure created successfully!"
echo ""
echo "Next steps:"
echo "1. Run the migration script to move files"
echo "2. Update import paths"
echo "3. Test the application"
