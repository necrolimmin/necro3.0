#!/bin/bash

systemctl restart cinema_back.service

cd /var/www/novastream/frontend
pm2 delete novastream-front 2>/dev/null || true
pm2 start npm --name novastream-front -- run start
pm2 save

systemctl restart nginx

