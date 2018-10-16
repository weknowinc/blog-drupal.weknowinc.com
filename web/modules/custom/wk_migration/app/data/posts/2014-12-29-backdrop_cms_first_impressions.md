---
layout: post
title: Backdrop CMS First impressions
description: "Personal opinions about Backdrop CMS 1.0 Preview"
categories: [articles]
tags: [Backdrop, Backdrop Modules, Migrate]
draft: false
---
Today I finally decided to install <a href="https://backdropcms.org/" target="_blank">Backdrop CMS</a> which is in version 1.0 preview and in Jan 15th, 2015.  will see his first official release.

Here I will not compare if is better or not than Drupal 7, I will just report the changes I saw and how complex I found the process to migrate a module from Drupal 7 to **Backdrop**

#Installation

Looks the same as Drupal 8, check the following image and let me know if you're not agree

<img src="{{site.url}}/assets/img/installing_backdrop_cms.png"/>

#File Structure
The files structure of Backdrop is so similar to Drupal 8 check in the following image.

<img src="{{site.url}}/assets/img/backdrop_file_structure.png"/>

#Modules UI

The modules menu is named now Functionality and as you can see in the following image, the Backdrop CMS core implement a feature implemented by module <a href="https://www.drupal.org/project/module_filter" target="_blank">module_filter</a> in Drupal 7.

<img src="{{site.url}}/assets/img/backdrop_admin_ui.png"/>

#Layouts

In **example.com/admin/structure/layouts** you can find a new concept **Layouts**, Layouts is an implementation similar to <a href="https://www.drupal.org/project/panels" target="_blank">Panels</a> Layouts. By default there are two layouts Admin and Default

<img src="{{site.url}}/assets/img/backdrop_layout_ui.png"/>

You can create your own Layouts and apply this layouts using a match by URL and/or you can add conditions, as you can see in the following image.

<img src="{{site.url}}/assets/img/backdrop_new_layout.png"/>

Backdrop doesn't have a menu to get the list of block generated via code, this list of block is only available when edit a Layout and add a block as you can see in the following imagen.

<img src="{{site.url}}/assets/img/backdrop_layout_add_block.png"/>

#Module Migration
Well maybe this is the part every buddy was expecting, OK to test I decide to check the list of most used modules in Drupal from <a href="https://www.drupal.org/project/usage" target="_blank">Usage</a> project.

I decide to test with <a href="https://www.drupal.org/project/token" target="_blank">Token</a> the #4 most used module in Drupal with 746,542 installations reported until Nov 15, 2014.

I skip ctools because off Ctools is too complex and views is already in **Backdrop** core :P

##Enable module in Backdrop
he structure of Modules in Backdrop is the same as Drupal 7, but we need to apply couple changes to avoid Backdrop report the module was invalid as you can see in the following image.

<img src="{{site.url}}/assets/img/backdrop_module_valid_invalid.png"/>

The only required change in file token.info is replace core to **backdrop**. Check how token.info must looks the file to be process by Backdrop

```
name = Token
description = Provides a user interface for the Token API and some missing core tokens.
core = 7.x
files[] = token.test

version = "7.x-1.5"
project = "token"
backdrop = 1.x
```

After that the installation process works like a charm, due the hooks hook_requirements, hook_schema and hook_update_xx are supported.

##Changes detected

As you can imagine there are some things must be change, in order to use the new Backdrop functions.

Caveats I just replace the code reported as PHP Fatal error.

###Replace function system_get_date_types
The function <a href="https://api.drupal.org/api/drupal/modules!system!system.module/function/system_get_date_types/7" target="_blank">system_get_date_types</a> does not exist in Backdrop, but after some reviews in source code of core I detect this function was replaced by <a href="https://api.backdropcms.org/api/backdrop/core%21modules%21system%21system.module/function/system_get_date_formats/1" target="_blank">system_get_date_formats</a>.

Also in Drupal 7 this function return a multidimensional array, and each array entry has a title index, in backdrop this index was replaced by **label**

###Replace cache_get and cache_set
These functions were replaced by function **cache**, this function receive a bin name and return a Cache class with methods set and get.

The default cache class in Backdrop is <a href="https://api.backdropcms.org/api/backdrop/core%21includes%21cache.inc/class/BackdropDatabaseCache/1" target="_blank">BackdropDatabaseCache</a>

Let me show how a get change from Drupal 7

```
Drupal 7: cache_get('field:info', 'cache_token');

Backdrop: cache('token')->get('field:info');
```

Now how a set change from Drupal 7 to Backdrop
```
Drupal 7: cache_set('field:info', $info, 'cache_token');

Backdrop: cache('token')->set('field:info', $info);
```

##Testing
After apply this changes in module token I need to test, I decide to create an script and try to execute with Drush, but I got the following error

```
Fatal error: Call to undefined function node_load() in /Users/enzo/www/backdrop/token_test.php on line 8
```

That is because Drush doesn't know how to load the Backdrop bootstrap, so I decide to create a script with the bootstrap included as you can see in the following snippet.

```
<?php

define('BACKDROP_ROOT', getcwd());

require_once BACKDROP_ROOT . '/core/includes/bootstrap.inc';
backdrop_bootstrap(BACKDROP_BOOTSTRAP_FULL);

$node = node_load(1);

$nid = token_replace('[node:nid]', array('node' => $node));

print 'Node ID: ' . $nid . "\n";
```

The previous script generate the following output.

```
Node ID: 1
```

At least this simple transformation is working, I am not saying the migration process of a module to Backdrop is a piece of cake, but until now looks like is not a titanic project for sure any case is different.

You can check more details about migrate module to Backdrop in video <a target="_blank" href="https://www.youtube.com/watch?v=by8mMhIpARA">Porting a Module to Backdrop - Basics</a>.

If you want to test my version of Token to Backdrop check the project <a href="https://github.com/backdrop-contrib/token" target="_blank">Backdrop Token</a>

I hope you found this blog entry useful.

