---
layout: post
title: "What is Drupal Console for me"
categories: [articles]
tags: [Drupa,Drupal,8,Console]
---
<img style="float:left; margin-right: 20px;;" src="{{site.url }}/assets/img/drupal_console_logo.png"/> Maybe you hear about the project <a href="http://drupalconsole.com/" target="_blank">Drupal Console</a> or maybe not because is an independent project related with <a href="https://www.drupal.org/drupal-8.0">Drupal 8</a>.

If you are a older Drupal user/developer you could find some similarities with <a href="https://github.com/drush-ops/drush" target="_blank">Drush</a> Project, and to be honest there are some similarities.

But if you are a <a href="http://symfony.com">Symfony</a> developer you will find some similarities with <a href="http://symfony.com/doc/current/components/console/introduction.html" target="_blank">Console Component</a> and actually it's what it is, Drupal Console is an implementation of Symfony Component to meet the Drupal 8 Way.

The Drupal Console, embrace the principles of Drupal 8 about using Symfony 2 components and other libraries to solve the commons problems instead to reinvent the wheel for everything, that concept is called <a href="http://fuseinteractive.ca/blog/im-lazy-here-have-pie" target="_blank">PIE</a> ( Proudly Invented Elsewhere).

Using the Symfony <a href="http://symfony.com/doc/current/components/console/introduction.html" target="_blank">Console Component</a> <a href="http://dmouse.net/">David Flores</a> and <a href="http://jmolivas.com/" target="_blank">Jesus Olivas</a> start a project to implement the same concept from Symfony to Drupal 8.

One of the incentives to create the project Drupal Console was have a pet project to force them to learn the Drupal 8 way.

But now the project is not a pet project anymore, you can see the full list of contributors at <a href="https://github.com/hechoendrupal/DrupalAppConsole/graphs/contributors" target="_blank">https://github.com/hechoendrupal/DrupalAppConsole/graphs/contributors</a> and if you want be part of this project just drop a message using the <a href="https://gitter.im" target="_blank">Gitter</a> room <a href="https://gitter.im/hechoendrupal/DrupalAppConsole">https://gitter.im/hechoendrupal/DrupalAppConsole
</a>.

The majority of commands in Drupal Console require a Drupal 8 instance, because the bootstrap of Drupal 8 is loaded to have access to all classes and libraries used in Drupal 8, to avoid re invent the wheel. But of course you can contribute commands without a dependency of Drupal 8.

Right now the Drupal Console has 28 commands listed below

```
$ drupal list
Drupal Console version 0.6.5

Available commands:
 cr                              Rebuild and clear all site caches.
 drush                           Run drush from console.
 help                            Displays help for a command
 list                            Lists commands
 self-update                     Update the console to latest version.
cache
 cache:rebuild                   Rebuild and clear all site caches.
config
 config:debug                    Show the current configuration.
container
 container:debug                 Displays current services for an application.
generate
 generate:command                Generate commands for the console.
 generate:controller             Generate & Register a controller
 generate:entity:config          Generate a new "EntityConfig"
 generate:entity:content         Generate a new "EntityContent"
 generate:form:config            Generate a new "ConfigFormBase"
 generate:module                 Generate a module.
 generate:plugin:block           Generate a plugin block
 generate:plugin:imageeffect     Generate image effect plugin.
 generate:plugin:rest:resource   Generate plugin rest resource
 generate:service                Generate service
migrate
 migrate:debug                   Display current migration available for the application
 migrate:execute                 Execute a migration available for application
module
 module:debug                    Display current modules available for application
 module:download                 Install module or modules in the application
 module:install                  Install module or modules in the application
 module:uninstall                Install module or modules in the application
router
 router:debug                    Displays current routes for the application
 router:rebuild                  Rebuild routes for the application
```

Most of them are oriented to generate code to speed up the process of development for Drupal 8, but in the same way of Symfony Console has commands to interact with Cache, Migrate and Database you can contribute modules for any purpose, so your imagination is the limit.

In my personal case I'm the contributor of commands related with Drupal 8 Migrate and Modules integration. My inspiration to create these commands wasn't to replace Drush, my ideas was to really understand how the Migration process works and be aware the module activation process.

After complete these commands now I can say I understand how Drupal 8 Migrate process works and how a module is installed and uninstalled.

But the learning process doesn't end in Drupal 8 components, when I try to create the command <a href="https://github.com/enzolutions/DrupalAppConsole/blob/module-command/src/Command/ModuleDownloadCommand.php" target="_blank">module:download</a> I have to declare libraries <a href="https://github.com/alchemy-fr/Zippy" target="_blank">Zippy</a> and
<a href="https://github.com/ARTACK/DOMQuery" target="_blank">DOMQuery</a> as dependencies using <a href="https://getcomposer.org" target="_blank">Composer</a>. Why code that libraries myself if I can use code create for non Drupal Developers :P.

So right now we are looking for testers and coders for new commands to improve the Drupal Console, if you think you can contribute with Drupal Console core you are more than welcome.

Also we expect in the future contribute to Symfony Console Component some code based in our needs, again why create <a href="https://www.acquia.com/blog/building-bridges-linking-islands">island of code</a>, instead of that push back code to the core and help other Open Source projects.






