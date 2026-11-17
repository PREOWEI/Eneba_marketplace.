FROM php:8.4-apache-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends libssl-dev pkg-config unzip \
    && pecl install mongodb-2.5.0 \
    && docker-php-ext-enable mongodb \
    && docker-php-ext-install opcache \
    && rm -rf /var/lib/apt/lists/* /tmp/pear

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-progress --optimize-autoloader \
    && composer check-platform-reqs --no-dev

# Explicit inputs keep diagnostics, credentials and seed scripts out of the image.
COPY database.php marketplace.php product_query.php product_suggestions.php product_covers.php ./
COPY data/ ./data/
COPY public/ ./public/
COPY docker/apache.conf /etc/apache2/sites-available/000-default.conf
COPY docker/ports.conf /etc/apache2/ports.conf
COPY docker/php.ini /usr/local/etc/php/conf.d/production.ini
COPY docker/start.sh /usr/local/bin/start-marketplace
RUN chmod +x /usr/local/bin/start-marketplace

ENV PORT=10000 APP_ENV=production
EXPOSE 10000
CMD ["start-marketplace"]
