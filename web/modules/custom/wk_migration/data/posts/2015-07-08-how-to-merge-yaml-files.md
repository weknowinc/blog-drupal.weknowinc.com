---
layout: post
title: "How to merge YAML files"
categories: [articles]
tags: [YAML,Silex, Symfony, Console]
---
By definition, a [YAML](http://yaml.org/) is a human-friendly data serialization standard for all programming languages.
But, in a less formal definition YAML is a great format for your configuration files, because, YAML files are as expressive
as XML files and as readable as INI files.

Currently, I am using YAML files for configuration in my [Drupal](http://drupal.org), [Silex](http://silex.sensiolabs.org/)
and [Symfony](http://symfony.com/) projects. Until now I could say is a good way to save information but I don't have a strong 
preference versus other formats, however, is easy to use, so no regrets.

However, a YAML file could represent anything, let me show you some examples.

The first one from [Drupal Console](http://drupalconsole.com) 
project where YAML files are used to store the translations string as you can see for [English](https://github.com/hechoendrupal/DrupalConsole/blob/master/config/translations/en/application.yml) and [Spanish](https://github.com/hechoendrupal/DrupalConsole/blob/master/config/translations/es/application.yml). Check
 an extract of translation.
 
```
console:
    arguments:
        drupal: 'Ruta a la raíz de Drupal'
        shell: 'Iniciar el shell.'
        env: 'Nombre del ambiente.'
        no-debug: 'Desactivar el modo de depuración.'
        learning: 'Generar código con explicaciones.'
        generate-chain: 'Imprimir opciones y argumentos como YAML para ser usado el comando chain'
        generate-inline: 'Imprimir opciones y argumentos de ejecución como llamada inline para ser usados en el futuro'
        root: 'Define la raíz de Drupal que se utilizará en la ejecución de los comandos'
        uri: 'URI del sitio en Drupal que se usará (para ambientes en multi-site o cuando esta usando un puerto alternativo)'
    messages:
        completed: '¡Ya puede empezar a usar el código generado!'
        chain:
            generated: 'A continuación puedes observar la representación en YAML del último comando ejecutado, puede copiarlo en ~/.console/chain/sample.yml para ejecutarlo en una secuencia de comandos'
        inline:
            generated: 'A continuación puedes encontrar la representación inline de este comando para volver a ejecutarlo más tarde'
        generated: '¡Ya puedes empezar a usar el código generado!'
        files:
            generated: '¡Ya puedes comenzar a usar el código generado!'
```

The second one from [Drupal](http://drupal.org) where is used by [Configuration Management](https://www.drupal.org/drupal-8.0/features#configuration) to export and import configuration across environments. 
Let me show you an example of a basic content type.

```
uuid: f5c966ac-b9a8-4ab8-b335-5380c6bb8524
name: drupal8.dev
mail: admin@example.com
slogan: ''
page:
  403: ''
  404: ''
  front: /node
admin_compact_mode: false
weight_select_max: 100
langcode: en
default_langcode: en
```
Now with all these YAML files surrounded our applications, a new kind of common and challenging tasks appears.

In the case of
Drupal Console project, because the project is in active development; new features and fixes are included constantly in
the code base and their translation are allocated in several YAML files, those files are always quite ahead than their translations, and
try to update without loose current translations is a slow and manual process.
 
As programmers, we hate manual tasks and in this particular case we always said "If only there be a command or util to do this silly task",
well I did to myself that question and my answer was, include in **Drupal Console** release [0.7.15](https://github.com/hechoendrupal/DrupalConsole/releases/tag/0.7.15) a new command
 **yaml:merge**
 
To execute this command, you need at least two YAML files to merge, as you can see in the following batch sentence.

```
$ drupal yaml:merge new.yml console.en.yml console.es.yml
```

What will happen after executing this command is a new file named new.yml containing all **console.en.yml** entries and entries translated in **console.es.yml**, in this way new translations will be maintained and new entries will be included in the new file.

Is possible to set the same file as last parameters and destination to have an immediate overwrite, but a new file is recommended to check the results.
  
If it's required you can include as many YAML files are required to merge, but, take into account that the YAML files in the right side of command will always overwrite their entries.

The Drupal Console has this kind of problems because there are different sources of contributions and different amount of contributions for language, but 
in the future I can image in Drupal we could have similar kind of requirements when the same piece of configuration is updated in different environment and 
we have the need of merge in one solution.

If you are not a user of **Drupal Console** but you need this command, don't worry if you don't have a Drupal environment, 
Drupal Console is a [Phar](http://php.net/manual/en/intro.phar.php) application completely independent of Drupal. To use a command like **yaml:merge**, just install it,
do your job and remove it, if it's not required anymore.

Other commands in Drupal Console related with YAML files are:

```
yaml:update:value
yaml:update:key
yaml:split
yaml:diff
```

I hope you found this article useful.