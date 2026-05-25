#!/bin/bash
set -e

EMAIL=${1:-admin@novastream.local}
cd "$(dirname "$0")/../backend"
python manage.py make_admin "$EMAIL"
