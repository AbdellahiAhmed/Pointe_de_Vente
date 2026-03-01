FROM php:8.1-fpm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       vim curl debconf apt-transport-https apt-utils \
       build-essential locales acl wget zip unzip \
       libicu-dev libzip-dev libpng-dev libjpeg-dev libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql intl zip gd opcache \
    && rm -rf /var/lib/apt/lists/*

COPY php.ini /usr/local/etc/php/php.ini

RUN curl -sSk https://getcomposer.org/installer | php -- --disable-tls && \
   mv composer.phar /usr/local/bin/composer

RUN usermod -u 1000 www-data

WORKDIR /var/www/html

EXPOSE 9000

CMD ["php-fpm"]
