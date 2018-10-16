---
layout: post
title: Apache issues after upgrade to Mac OS X Yosemite.
description: "Fix Apache after upgrate to Mac OS X Yosemite."
categories: [articles]
tags: [PHP, Apache, Mac, OS X]
draft: false
---
<img style="float:left; margin-right: 20px;" src="{{site.url }}/assets/img/mac_osx_yosemite.png"/> Last night I had the *brilliant* idea of upgrade to latest version of Mac OS X <a href="http://www.apple.com/osx/" target="_blank">Yosemite</a> and the upgrade process itself was slow as usual but without any apparent error.

The problems popup when I decide continue the development of <a href="https://github.com/enzolutions/generator-marionette-drupal" target="_blank">Yeoman Marionette Drupal generator</a> against Drupal 8.

When I try to use my regular installation of Drupal 8 I got the infamous message *"It Works!"*, so the upgrade screw my apache configuration.

After executing the following command I detect my system now has <a href="http://httpd.apache.org/docs/2.4/">Apache 2.4</a>.

```
$ httpd -v
Server version: Apache/2.4.9 (Unix)
Server built:   Sep  9 2014 14:48:20
```

# Where is my previous configuration

You can find your old configuration at */etc/apache2/httpd.conf~previous*, but could a bad idea just restore because some directives could be wrong.

Instead of I start to re-enable the things I used to have enabled.

## Mod Rewrite

Because I'm a Drupal developer this is a mandatory Apache module, to re-enabled you just need edit the file */etc/apache2/httpd.conf* and enable the following line

```
LoadModule rewrite_module libexec/apache2/mod_rewrite.so
```

## Virtual Hosts

If you used to have virtual host for your different project this feature is gone, again you just need to enable the directive to load where are located your virtual host as you can see in the following snippet.

```
# Virtual hosts
Include /private/etc/apache2/extra/httpd-vhosts.conf
```

### Client denied by server configuration

After enable your virtual hosts is probable you can't access your sites and if you check your error log you will get an error similar to following log.

```
[Sun Oct 19 10:29:31.338082 2014] [authz_core:error] [pid 3008] [client 127.0.0.1:51587] AH01630: client denied by server configuration: /Users/enzo/www/drupal8/
```

After read some document I found I have to add to my *Directory* section of Virtual Host the directive *Require all granted*, after apply my Virtual Host looks like next definition.

```
<VirtualHost *:80>
    ServerAdmin enzo@enzolutions.com
    DocumentRoot "/Users/enzo/www/drupal8"

    ServerName drupal8

    #ServerAlias www.dummy-host.example.com
    <Directory /Users/enzo/www/drupal8>
        Require all granted
        Options Includes FollowSymLinks
        AllowOverride All
        Order allow,deny
        Allow from all
    </Directory>

    ErrorLog "/private/var/log/apache2/drupal8-error.log"
    CustomLog "/private/var/log/apache2/drupal8-access.log" common
</VirtualHost>
```

After this changes is probable your PHP version require some tweaks, in this case I recommend read the blog entry "<a href="{{site.url }}/articles/2014/10/17/manage-php-versions-with-phpbrew">Manage PHP versions with Phpbrew</a>".

I hope you find this article useful.
