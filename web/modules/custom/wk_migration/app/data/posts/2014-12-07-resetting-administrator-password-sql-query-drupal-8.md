---
layout: post
title: Resetting the administrator password with sql-query in Drupal 8
description: "How to recovery the access to a Drupal 8 website"
categories: [articles]
tags: [Drupal, MySQL, Recovery, Password]
draft: false
---
#The Problem

When in Drupal 8, the password for user #1 (the administrator) is lost and the email notification don't work, it is possible to set the password via a database query.

Right now we are in the middle of the development of Drupal 8 and the usual command <a href="http://www.drushcommands.com/drush-6x/user/user-login" target="_blank">**drush uli**</a> provided by <a href="http://www.drush.org/" target="_blank"></a>Drush doesn't work.

Right now when I try to execute that command I got the following error.

```
Fatal error: Call to undefined function url() in /Users/enzo/.composer/vendor/drush/drush/commands/user/user.drush.inc on line 466
Drush command terminated abnormally due to an unrecoverable error.
```
#The Solution

##Generate a new password

First, you have to generate a password hash that is valid for your site.

Execute the following commands from the command line, in the Drupal 8 root directory:

```
$ php core/scripts/password-hash.sh 'your-new-pass-here'

password: your-new-pass-here    hash: $S$EV4QAYSIc9XNZD9GMNDwMpMJXPJzz1J2dkSH6KIGiAVXvREBy.9E
```

Be careful not to include more or less characters as the hash. These hashes look somewhat like **$S$EV4QAYSIc9XNZD9GMNDwMpMJXPJzz1J2dkSH6KIGiAVXvREBy.9E**.

We will use the generated password later.

## Update the user password.

Now you need to update the user password, in our case we need update the Administrator password, fortunately the UID for Administrator is 1 equal to previous versions of Drupal.

With the new password we need run the following SQL statement.

```
UPDATE users_field_data SET pass='$S$E5j59pCS9kjQ8P/M1aUCKuF4UUIp.dXjrHyvnE4PerAVJ93bIu4U' WHERE uid = 1;
```

## Dealing with Cache

At this point if you try to login in the Drupal 8 website you will rejected, it's because the login system don't read directly the table **users_field_data** instead of a cache for entities is used.

To flush the cache for a specific user entity with compromise the rest of cache of your system you can use the following SQL statement.

```
DELETE FROM cache_entity WHERE cid = 'values:user:1';
```

Now you can grab a cup of coffee/tea and enjoy your Drupal 8 website.

I hope you found this article useful.
