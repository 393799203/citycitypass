#!/bin/sh

MODE=${DEPLOY_MODE:-normal}

echo "Starting server with mode: $MODE"

if [ "$MODE" = "full" ]; then
  echo "Full deploy mode: resetting database..."
  npx prisma migrate reset --force --skip-generate || true
  echo "Pushing schema..."
  npx prisma db push --accept-data-loss
else
  echo "Normal mode: pushing schema..."
  npx prisma db push
fi

echo "Running seed..."
npx prisma db seed

echo "Starting server..."
npm start
