---
layout: post
title: Yeoman Generator Marionette JS + Drupal
description: "Yeoman generator to create app with Marionette JS & Drupal."
categories: [articles]
tags: [Ajax, Javascript, RequireJS, MarionetteJS, BackboneJS, MarionetteJS, Drupal]
draft: false
---

[Yeoman](http://yeoman.io) [MarionetteJS](http://marionettejs.com) + [Drupal](drupical.org) generator

Today I release the version 0.1.0-beta of <a href="{{ site.url }}/projects/yeoman_generator_marionette_drupal">Yeoman Generator Marionette + Drupal</a>.

If you want to create your own version of this generator, you can fork or download my version at

```
$ git clone git@github.com:enzolutions/generator-marionette-drupal.git
```

This generator create a structured HTML 5 application generating modules using RequireJS, includes Grunt support to automate tasks.

Compass is used to generate CSS using bootstrap-sass.

The HTML 5 application is defined using a MVC pattern implemented with MarionetteJS and Backbone.Drupal for data model.

Includes scaffolding commands to create templates, models, collections, views and layouts.
