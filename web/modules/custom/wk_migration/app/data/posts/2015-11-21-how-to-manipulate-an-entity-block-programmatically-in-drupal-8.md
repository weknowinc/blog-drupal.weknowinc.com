---
layout: post
title: "How to manipulate an Entity:Block programmatically in Drupal 8"
categories: [articles]
tags: [Drupal,Drupal8]
---
This is my first post after Drupal 8 got his first official release, now it's time to start to do some basic stuff using the Drupal 8 way.

Even I have been working a lot with Drupal 8 core, there are some typical things that I found still a little bit strange. But being honest if more my fault that Drupal 8 fault; All we have just to adjust own mental mindsets.

Today I want to show you how to deal with Block in Drupal 8 because yesterday I spent several hours trying to understand how to manipulate a block to extend a functionality for [Drupal Console](http://drupalconsole.com) project.

#Get a list of blocks
This looks an easy task, but there are some considerations you must take into account.

First, Do you need a list of all *Blocks* available or all *Blocks* enabled?

Why this separation is important, well as you maybe know or hear in Drupal 8 blocks are plugins and use [annotations](https://www.drupal.org/node/1882526) to expose to Drupal 8 their existence. Therefore, we could get a list of blocks but they will not be [Entity:Block](https://api.drupal.org/api/drupal/core!modules!block!src!Entity!Block.php/8) objects, we could get just their definition, this is important because you can't manipulate them, so you just can use as extra information in your logic.

Only blocks that are enabled and assigned to a theme and in a region are Entity:Block instances.

##Get available blocks

Using the service **[plugin.manager.block](https://api.drupal.org/api/drupal/core!core.services.yml/service/plugin.manager.block/8)** we will get all blocks available definition.
```
$blockManager = \Drupal::service('plugin.manager.block');
$contextRepository = \Drupal::service('context.repository');

// Get blocks definition
$definitions = $blockManager->getDefinitionsForContexts($contextRepository->getAvailableContexts());

print_r($definitions['help_block']);
```

Executing the code above we will an output for *help_block* similar to the following snippet.

```
Array
(
    [admin_label] => Drupal\Core\StringTranslation\TranslatableMarkup Object
        (
            [string:protected] => Help
            [translatedMarkup:protected] =>
            [options:protected] => Array
                (
                )

            [stringTranslation:protected] =>
            [arguments:protected] => Array
                (
                )

        )

    [category] => Help
    [derivative] =>
    [id] => help_block
    [class] => Drupal\help\Plugin\Block\HelpBlock
    [provider] => help
)
```

As you can see is valuable information about the block but it's not a real Entity:Block instances.

##Get a list of all Entity:Block available

Using [Drupal:entityQuery](https://api.drupal.org/api/drupal/core!lib!Drupal.php/function/Drupal%3A%3AentityQuery/8) class, we can build a kind of SQL query for a specific entity in this case for Block entities. The following piece of code gets the full list of blocks available.

```
$ids = \Drupal::entityQuery('block')->execute();
```

Off course we can filter the results, for instance, we could use the condition plugin to fetch all block related with help module, as you can see in the following snippet of code.
```
$ids = \Drupal::entityQuery('block')
    ->condition('plugin', 'help_block')
    ->execute();

print_r($ids);
```

After executing the code above we could get an output similar this:

```
Array
(
    [bartik_help] => bartik_help
    [himalaya_help] => himalaya_help
    [seven_help] => seven_help
)
```

I got three Entity:Block ids, related to the three themes I have enabled in my system Bartik, Seven and [Himalaya](https://www.drupal.org/project/himalaya).

#Loading an Entity:Block

Until now we get definition of blocks and Entity:Block ids, but not a real Entity:Block, let me show you how do that using the Drupal 8 class use [Drupal\block\Entity\Block](https://api.drupal.org/api/drupal/core%21modules%21block%21src%21Entity%21Block.php/class/Block/8) as you can see below.

```
use Drupal\block\Entity\Block;
$block = Block::load('bartik_help');
print_r($block);
```

The code above load the Entity:Block for **bartik_help**, if you execute this code in your custom module you will get an output like this.

```
Drupal\block\Entity\Block Object
(
    [id:protected] => bartik_help
    [settings:protected] => Array
        (
            [id] => help_block
            [label] => Help
            [provider] => help
            [label_display] => 0
        )

    [region:protected] => content
    [weight:protected] => -30
    [plugin:protected] => help_block
    [visibility:protected] => Array
        (
        )
......
......
    [dependencies:protected] => Array
        (
            [module] => Array
                (
                    [0] => help
                )

            [theme] => Array
                (
                    [0] => bartik
                )

        )

    [provider] =>
)
```

#Create an Entity:Block

Last but not least, I will show you how to create an Entity:Block from code definition.

Imagine did you created a block plugin using **Drupal Console** with id default_block. Using the following command.

```
$ drupal generate:plugin:block
```

If you want to enable that generated block programmatically, you can use the following snippet of code.


```
$blockEntityManager = \Drupal::service('entity.manager')->getStorage('block');
$block = $blockEntityManager->create(
  array(
      'id'=> $plugin_id,
      'plugin' => $plugin_id,
      'theme' => $theme
  )
);
$block->setRegion('content');
$block->save();
```

Besides, I decided to assign the default_block inside Content region for theme Bartik, after creating the Entity:Block.

I hope you found this article useful.