---
layout: post
title: Manage PHP versions with Phpbrew.
description: "Install and configure Phpbrew."
categories: [articles]
tags: [PHP, Apache]
draft: false
---

<img style="float:left; margin-right: 20px;" src="{{site.url }}/assets/img/phpbrew.png"/> If you are a PHP developer I'm sure you have been in a situation where you have to maintain several projects and is possible some of them require different version of PHP.

To resolve this situation described above nowadays the common recommendation is install a virtual machine like <a href="https://www.vagrantup.com/" target="_blank">Vagrant</a> or <a href="https://www.docker.com/" target="_blank">Docker</a> and off course works but if you are not a big fan of *Virtual Machines* like me and specially to only change the PHP version I have good news you can resolve your problems using the project <a href="http://phpbrew.github.io/phpbrew/" target="_blank">Phpbrew</a>.

Let me show you how to install and use.

# Install Phpbrew.

## Dependencies.

If you already have an environment to dev in PHP is probable you can skip this section.

The following utils are required.

* automake
* autoconf
* curl
* pcre
* re2c
* mhash
* libtool
* icu4c
* gettext
* jpeg
* libxml2
* mcrypt
* gmp
* libevent

If you are in Mac OS X and you use <a href="http://brew.sh/" target="_blank">brew</a> you run the following command.

```
$ brew install automake autoconf curl pcre re2c mhash libtool icu4c gettext jpeg libxml2 mcrypt gmp libevent
$ brew link icu4c
```
## Download, Install and Initialize.

To install you just need to execute the following commands

```
$ curl -L -O https://github.com/phpbrew/phpbrew/raw/master/phpbrew
$ chmod +x phpbrew
$ sudo mv phpbrew /usr/bin/phpbrew
```
Now you must initialize your system executing the following command.

```
$ phpbrew init
```

Then add these lines to your *.bashrc*, *.bash_profile* or *.zshrc* file

```
export PHPBREW_SET_PROMPT=1
source ~/.phpbrew/bashrc
```
# Phpbrew commands

## List PHP versions available to be installed

```
$ phpbrew known
5.6:  5.6.1, 5.6.0 ...
5.5:  5.5.17, 5.5.16, 5.5.15, 5.5.14, 5.5.13, 5.5.12, 5.5.11, 5.5.10 ...
5.4:  5.4.33, 5.4.32, 5.4.31, 5.4.30, 5.4.29, 5.4.28, 5.4.27, 5.4.26 ...
5.3:  5.3.29, 5.3.28, 5.3.27, 5.3.26, 5.3.25, 5.3.24, 5.3.23, 5.3.22 ...
```
## Install a PHP specific version of PHP

```
$ phpbrew install 5.5.10
```
You need wait until Phpbrew configure your system.

## Install a PHP with specific libraries or virtual variant.

```
$ sudo phpbrew install 5.5.10 +mysql +pdo +ctype +mhash +hash +iconv +json +iconv +gd +apxs2=/usr/sbin/apxs -- --with-gd --enable-gd-natf --with-jpeg-dir --with-png-dir

$ sudo phpbrew install 5.5.10 +default +mysql +hash +iconv +gd +apxs2=/usr/sbin/apxs -- --with-gd --enable-gd-natf --with-jpeg-dir --with-png-dir
```

If you don't know where is located the directory for your apache <a href="http://httpd.apache.org/docs/2.2/programs/apxs.html">apxs</a> you can execute the following command.

```
$ whereis apxs
/usr/sbin/apxs
```

The previous install works to use with <a href="http://drupal.org" target="_blank">Drupal</a> 8 and <a href="spress.yosymfony.com" target="_blank">Spress</a>.


## Get a list of available libraries or variants

```
$ phpbrew variants
Variants:
  all, apxs2, bcmath, bz2, calendar, cgi, cli, ctype, curl, dba, debug, dom,
  embed, exif, fileinfo, filter, fpm, ftp, gcov, gd, gettext, hash, iconv,
  icu, imap, inifile, inline, intl, ipc, ipv6, json, kerberos, libgcc,
  maintainer, mbregex, mbstring, mcrypt, mhash, mysql, opcache, openssl,
  pcntl, pcre, pdo, pgsql, phar, phpdbg, posix, readline, session, soap,
  sockets, sqlite, static, tidy, tokenizer, wddx, xml, xml_all, xmlrpc,
  zip, zlib


Virtual variants:
  dbs: sqlite, mysql, pgsql, pdo
  mb: mbstring, mbregex
  neutral:
  default: bcmath, bz2, calendar, cli, ctype, dom, fileinfo, filter, ipc,
  json, mbregex, mbstring, mhash, mcrypt, pcntl, pcre, pdo, phar, posix,
  readline, sockets, tokenizer, xml, curl, zip


Using variants to build PHP:

  phpbrew install php-5.3.10 +default
  phpbrew install php-5.3.10 +mysql +pdo
  phpbrew install php-5.3.10 +mysql +pdo +apxs2
  phpbrew install php-5.3.10 +mysql +pdo +apxs2=/usr/bin/apxs2
```
## List php version versions available in your system

```
$ phpbrew list
Installed versions:
* php-5.5.10
```

## Change php Version

```
$ phpbrew switch php-5.5.10
```

## Disable Phpbrew

```
$ phpbrew off
phpbrew is turned off.
```
After disable Phpbrew you can execute the following command to check the current status of system

```
$ phpbrew list
Installed versions:
* (system)
  php-5.5.10
```

As you can see the PHP version available if the normal PHP version your system have, off course you enable again other version using the *switch* command explained above.

# Enable PHPbrew version in Apache.

After switch a version you must to inform to apache about the new version of PHP apache editing the apache config file */etc/apache2/httpd.conf* or */private/etc/apache2/httpd.conf* as you can see in the follow snippet.

```
#LoadModule php5_module libexec/apache2/libphp5.so #Disabled
LoadModule hfs_apple_module libexec/apache2/mod_hfs_apple.so
LoadModule php5_module libexec/apache2/libphp5.5.10.so
```

As you can imagine a restart of Apache Server is required.

## Update Phpbrew

```
$ phpbrew self-update
```

# Modify your PHP info.

Is so probable after enable a new version of PHP you lost your previous setup and you need to apply that tweaks and tricks in your new PHP.ini to determine where are located you just need execute the next command.

```
$ phpbrew info | grep php.ini
Loaded Configuration File => ~/.phpbrew/php/php-5.5.10/etc/php.ini
```

Remove the grep portion to get the whole information.
