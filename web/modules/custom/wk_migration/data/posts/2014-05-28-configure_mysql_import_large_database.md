---
layout: post
title: How to configure MySQL to import large database
description: "Instructions to enable import huge database in your MySQL server."
categories: [articles]
tags: [MySQL, Import]
draft: false
---

On many occasions we need to install in our local enviroment a copy of production sites for development or debugging process, this entails that need to import large databases.

The most common error is that you cannot import the database because for some reason you loose the communication with the <a target="_blank" href="http://www.mysql.com/">MySQL</a> server, as shown below.

````
$ /mysql -f -uroot -proot mydb -h 127.0.0.1 < ~/Downloads/prod-mysql-2013-01-29.sql
ERROR 2006 (HY000) at line 6565: MySQL server has gone away
````

To fix this error you must to change the default configuration of MySQL.

MySQL store his configuration in a file commonly named my.cnf and could be located in different locations depending the OS version you have installed.

If you do not know the location of this file, you can use the following command shown below to determine where you expect to find locations MySQL settings.

````
$ ./mysql --help | grep my.cnf
/etc/my.cnf /etc/mysql/my.cnf /Applications/MAMP/conf/my.cnf ~/.my.cnf
````

In my case I had MySQL as part of <a target="_blank" href="http://www.mamp.info/">MAMP</a> and this file is not created by default. For this reason I will create a new file located at */Applications/MAMP/conf/my.cnf* becuase is one of the location where MySQL will look his configuration file.

I recommend to use the sample provided by MySQL documentation for large databases localed at */usr/share/doc/mysql-server-5.0/examples/my-large.cnf.gz.*

After copy the suggested configuration from documantion, I have to apply two changes to warranty the import process don't fail.

* Remove Directive # *skip-locking*

* Increase setting *max_allowed_packet = 100M*

Then just be enough restart the MySQL server and try to import the database again.

You can check my version of my.cnf <a target="_blank" href="http://7sabores.com/sites/default/files/my.cnf_.txt">here</a>
