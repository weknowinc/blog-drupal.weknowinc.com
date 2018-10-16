---
layout: post
title: Understanding Configuration Management in Drupal 8
description: "Practical guide about how to migrate configuration between two sites in Drupal 8"
categories: [articles]
tags: [Drupal, Migrate]
draft: false
---
In few months we will get the new release of Drupal the #8 (I hope) and I think it's time to start to test, learn and write about the new ways we have in Drupal 8 to do our old tricks.

Today I want to talk about the Drupal 8 <a target="_blank" href="http://drupal8cmi.org/">Initiative Configuration Management</a>, this initiative pretend to facilitate the process of pass Site Building stuffs from Dev environments to Production.

As you can imagine this feature will be a replacement of Drupal <a target="_blank" href="https://www.drupal.org/project/features">Features</a> and if you don't use or don't like Features also will be a replacement for Drupal <a target="_blank" href="https://www.drupal.org/project/bundle_copy">Bundle Copy</a>

#Installing Drupal 8

Right now there isn't an official Drupal release for Drupal 8, but if you can start to test you can get directly from git repository.

If you don't have plans to contribute with code to Drupal 8 you can use the following command to get just the latest version of Drupal 8 but without the whole git history reducing dramatically the download process.

```
git clone -depth 1 --branch 8.0.x http://git.drupal.org/project/drupal.git [FOLDER_NAME]
```
After that you just need create a Database and point your webserver to this folder and start the installation in the same way you usually do for Drupal 7.


#Configuration Management Install

You don't need install Configuration Management module, because is part of Drupal 8 Core and is already installed when you complete a standard Drupal 8 installation, as you can see in the following image.

<img src="{{site.url}}/assets/img/configuration_management_module_enable.png"/>

As you can imagine, you can't disable the Configuration Management module.

#Export Configuration

As I said at the beginning Configuration Management is a replacement for Features, so you need to work in your website doing Site Building tasks like creating or modifying content types and other tasks like creating Views(part of Drupal 8 Core).

Now we will call the first Drupal 8 Installation **Devel#1** of a new Drupal 8 project and as you can imagine we need to share our progress with the rest of team and to avoid to create a DB Dump and force the rest of the team import we will use the Configuration Management.

The administrator of **Devel#1** has to go page: example.com/admin/config/development/configuration/full/export the UI will looks similar to image below.


<img src="{{site.url}}/assets/img/configuration_management_full_export.png">

After press the button Export you will get a zip file named **config.tar.gz**, after you uncompress the zip file you will get a config folder with severals files in <a target="_blank" href="http://symfony.com/doc/current/components/yaml/yaml_format.html">YAML</a> format and each one represent a isolate piece of configuration of our site. Below you can a partial list of files created by export.

```
block.block.bartik_footer.yml       menu.entity.node.page.yml
block.block.bartik_help.yml       menu_link.static.overrides.yml
block.block.bartik_login.yml        menu_ui.settings.yml
block.block.bartik_powered.yml        node.settings.yml
block.block.bartik_search.yml       node.type.article.yml
block.block.bartik_tools.yml        node.type.book.yml
block.block.seven_breadcrumbs.yml     node.type.page.yml
block.block.seven_content.yml       rdf.mapping.comment.comment.yml
block.block.seven_help.yml        rdf.mapping.node.article.yml
```

Now we have the options to share all files or just one of them with the rest of the team.

#Importing Configuration

Now we have the files required to import the configuration in other Drupal installation **Devel#2** but we need to prepare the destination.

The Drupal 8 installation process create two folders to handle the import and export process, the installer create two folders inside <DOCROOT>/sites/default/files using random names, but we can check the proper names checking our configuration at <DOCROOT>/sites/default/setting.php.

Let me show you an example of that configuration file:

```
$settings['install_profile'] = 'standard';
$config_directories['active'] = 'sites/default/files/config_0HU-CmGmyKok3uG6Ao8Lv4WCsVZDwqitSKnQcUNPJmtrKWdgQuM4nhQNZO_T5Mcsmaz-bFcOyA/active';
$config_directories['staging'] = 'sites/default/files/config_0HU-CmGmyKok3uG6Ao8Lv4WCsVZDwqitSKnQcUNPJmtrKWdgQuM4nhQNZO_T5Mcsmaz-bFcOyA/staging';
```
As you can see now we have two concepts **active** and **staging**.

The **active** folder must contain the current site configuration, but by default is empty because the default storage for current site is Database but is possible change I will write about that in other blog entry.

The **staging** folder contain any configuration we want to import in our site, here we must copy the files we get from export process.

I recommend use a version system like GIT to control the staging files and change configuration to use a non hash folder name, check my recommendation below:

```
$settings['install_profile'] = 'standard';
$config_directories['active'] = 'sites/default/files/config_rK_6KVDPn-s9l-ea_L0XBN1GzJlcnrZ3CssUXn1eQ7G98viRJXesYsSdsf_KjxkCRgelximKzg/active';
$config_directories['staging'] = 'sites/default/config/staging';
```

Is required your web server have permissions to read the configuration files, for instance if _www is the user running your web server you must run the following commands:

```
$ sudo chown -R _www sites/default/config/staging/
$ sudo chmod -R 755 sites/default/config/staging/
```

Until here all looks OK, but If you go to the page example.com/admin/config/development/configuration you will get the following error

<img src="{{site.url}}/assets/img/configuration_management_sync_error.png"/>

We will solve this issue in next section.

##Force Site UUID match

The Configuration Management only allow sync configuration between same site or project to avoid issues importing configuration from site a.com to b.com, to accomplish this validation Drupal 8 generate a <a target="_blank" href="https://www.drupal.org/project/uuid">UUID</a> for each site.

You cat get your current site UUDI executing the following command

```
$ drush cget system.site
```
The command above we will have a similar output to next listing

```
uuid: 236fa77c-d83e-42de-8a03-03c574c00160
name: backend.com
mail: enzo@enzolutions.com
slogan: ''
page:
  403: ''
  404: ''
  front: node
admin_compact_mode: false
weight_select_max: 100
langcode: en
```

The config import has a different UUID, you can confirm the UID with the following command

```
$ cat sites/default/config/staging/system.site.yml
```

For that reason uou need to change the value of Site UUID using the following Drush command:

```
$ drush cedit system.site
```

The command above enable you to use your favorite text editor to set the same UUID present in staging config files.

## Run Sync

After change the UUID and change the permissions, if you visit again the page example.com/admin/config/development/configuration you will see all changes, deletions, renames, and additions as you can see in the following image:

<img src="{{site.url}}/assets/img/configuration_management_sync.png"/>

You can review the differences and remove some files from staging folder if you are not happy with the result and finally execute the Import All process.

If you are a Drush lover you still can run this process with Drush with the following command:

```
$ drush config-import staging
```

After complete the import you have now site sync.

I hope you have found this article useful.
