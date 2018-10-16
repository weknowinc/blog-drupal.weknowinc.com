---
layout: post
title: "How to include PHP code in Drupal 8 Views"
categories: [articles]
tags: [Drupal8,Views,PHP]
---
Did you recall the last time you tried to resolve an issue in your program using a small piece of PHP in your views using [Views Custom Field](https://www.drupal.org/project/views_customfield) in Drupal 6 and  [Views PHP](https://www.drupal.org/project/views_php) in Drupal 7? Don't lie everybody did that at least once.

Even the fact those are accepted module by the Drupal security team, this solution is really dangerous because execute code using PHP function [eval](http://php.net/manual/es/function.eval.php), execute PHP code loaded from DB it's really bad in terms of security and stability.
 
Moreover, if someone is auditing your code, this one is the first bad practice the auditor will try to find in your code and you will get a nice recommendation that you must create your own view field handler to do that logic, in order to improve the quality of your code. But to be honest, I did that in the past and even I did that several times, I always found this process really hard.

Nowadays the Drupal community is excited about the release of the first official release of [Drupal 8](https://www.drupal.org/news/drupal-8.0.0-released), so I thought it's time to start with the classical posts about how to do our old practices in this new thing. Today I will share with you how to avoid the usage of Views PHP modules and be able to include PHP in your views but still pass the audit of your code :P.

In this post, I will use the project [Drupal Console](http://drupalconsole.com) to facilitate my job.

#1. Create a Drupal 8 module.
To generate a module you have two options, the first one is using the interactive mode, where the application will ask you all options available in the command. Use the following command to execute the interactive mode, check the following image to see a classical execution.

```
$ drupal generate:module
```

<img src="{{ site.url }}/assets/img/console_generate_module.png"/>

The second option executes the command but passing all options inline as you can see below.

```
$ drupal generate:module --module="No Views PHP" --machine-name=no_views_php --module-path=/modules/custom --description="Custom views field to include PHP logic in views." --core=8.x --package=Other
```

#2. Generate a custom views field
Views are now in core of Drupal 8, and everything change. As I said before "Drupal 8 is just a new project with same name and logic". So if you knew something about views, well that is not too much useful in terms of code, but the logic, in general remains.

In Drupal 8 views, everything is handled via Plugins and fields are not the exception, if you need to create a custom field you must generate a custom views plugin field. Fortunately, I did a generator in **Drupal Console** for this task, check the following command to generate a views plugin field.

```
$ drupal generate:plugin:views:field --module=no_views_php --class=PHPViewsField --title="PHP Field" --description="Enable to include and run PHP code in your modules as part of a view"
```

The command above will generate the following files:

```
Site path: /Users/enzo/www/drupal8-rc1
1 - modules/custom/no_views_php/no_views_php.views.inc
2 - modules/custom/no_views_php/src/Plugin//views/field/PHPViewsField.php
```

#3. Install your module.
Now we need to install our generated module with the following command.

```
$ drupal module:install no_views_php
```

Now if you edit the Frontpage view at **http://example.com/admin/structure/views/view/frontpage** you can use the custom field generated after change the mode from show *content* to show *fields* as you can see in the following image.

<img src="{{ site.url }}/assets/img/views_custom_plugin.png"/>

Pro tip: If you don't see your generated field, try executing **$ drupal cache:rebuild all** again :P

After applying the minimum configuration to the field, you will get a view preview similar to this image:

<img src="{{ site.url }}/assets/img/view_frontpage_preview.png"/>

The view plugin field generated, by default, return a random string just to show that it's working. Now you have to do your magic in your custom module.

#4. Implementing your logic
In order to implement your custom logic you have to edit the generated file **modules/custom/no_views_php/src/Plugin//views/field/PHPViewsField.php** and more specific inside the method **render**, this method receives an object of [Drupal\views\ResultRow](https://api.drupal.org/api/drupal/core!modules!views!src!ResultRow.php/class/ResultRow/8) as a parameter.
 
The default method generated looks like next snippet.
 
```
public function render(ResultRow $values) {
  // Return a random text, here you can include your custom logic.
    // Include any namespace required to call the method required to generte the
    // output desired
    $random = new Random();
    return $random->name();
}
```
 
Now I will change the logic to use the title field in row to print it reversed, as you can check in the following code.
 
```
public function render(ResultRow $values) {
    // Return a random text, here you can include your custom logic.
    // Include any namespace required to call the method required to generte the
    // output desired
    $title = strip_tags($this->view->field['title']->original_value);
    return strrev($title);
}
```

As a result now our field will look different, check the following image.

<img src="{{ site.url }}/assets/img/view_frontpage_preview2.png"/>

As you can see this another silly implementation of a custom PHP, but now you can include in this class any service required to do your magic and transform each row in a view using other row fields as input.

Even better you can include in your code a handler to throw an exception if is required, so your code could as complex and professional as you want.

If you are wondering why don't contribute this as a replacement of Views PHP in Drupal 8, well I thought due we have a Drupal Console generator for that, it's not necessary. Inside Drupal Console project is the eternal discussion about what things must be a generator and what others must be contributed modules.
 
Some of them became in both a generator and Drupal 8 modules, check out the following list
 
 - [Entity Rest Extra](https://www.drupal.org/project/entity_rest_extra)
 - [IP Consumer Auth](https://www.drupal.org/project/ip_consumer_auth)
 - [Image Raw Formatter](https://www.drupal.org/project/image_raw_formatter)

I hope you found this blog post useful.
