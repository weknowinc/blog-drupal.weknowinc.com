---
layout: post
title: How to configure MySQL to import large database
description: "Intructions to prepare MySQL to import large databases"
categories: [articles]
tags: [MySQL, Import]
draft: false
---

On many occasions we need to install in our local machine production sites for development or just for faster debugging, this entails that we need to import very large databases.

The most common mistake is that you can not import the database, returning an error that communication with the <a target="_blank" href="http://www.mysql.com/">MySQL</a> server has been lost, as shown below.

```
$ /mysql -f -uroot -proot mydb -h 127.0.0.1 < ~/Downloads/prod-mysql-2013-01-29.sql
ERROR 2006 (HY000) at line 6565: MySQL server has gone away
$
```

To fix this error you must change the default configuration of MySQL, if you do not know the location of this file can use the command shown below to determine at which locations MySQL expects to find the configuration.

```
$ ./mysql --help | grep my.cnf
/etc/my.cnf /etc/mysql/my.cnf /Applications/MAMP/conf/my.cnf ~/.my.cnf
$
```

In my case I have MySQL provided by <a target="_blank" href="http://www.mamp.info">MAMP</a>, so I need create a file in the location /Applications/MAMP/conf/my.cnf, based on a configuration for large databases which is available in the documentation MySQL and should be available in the path */usr/share/doc/mysql-server-5.0/examples/my-large.cnf.gz*.

I will apply two changes to enable big importations.

* Remover Directive # skip-locking
* Increase max_allowed_packet = 100M

Then you just need restart the MySQL server and try to import the database again.

You can find my version of my.cnf <a target="_blank" href="{{ site.url }}/assets/attaches/my.cnf.txt">here</a>.
