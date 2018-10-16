---
layout: post
title: "Why languages are so important in technology?"
categories: [articles]
tags: [i18n,Drupal,Console, YAML]
---
For a long time everybody related technology with the US and more specifically with Silicon Valley, and is normal to have iconic concepts. Now, how that concept affect the penetration of technology around the world? Well, one of the most common commandment for non English speakers is "**You** must learn english if you want to work in this industry".

Personally I partially disagree with that conception, I recognize English is important in IT industry because as a web developer if I could at least read English I got access to the latest news and could be in sync with the trendy topics. But also is true that is possible to work in technology industry without any knowledge of English, if you don't believe me, think about China, India, Japan or Russia they use IT every day and most of them only speak their mother language.

It's probably true that they could receive the latest news in technology a little late, but think about this, humankind is sending astronauts to space using [Soyuz](https://en.wikipedia.org/wiki/Soyuz) a URSS technology from the 70's, so I guess we can survive with a little delay.

Moreover, what I thought is really bad with the concept of only use English as the medium to communicate your products, of course that only applies to products that plans to conquer the world (insert [Dr. Evil](https://en.wikipedia.org/wiki/Dr._Evil) laugh here).

Let's talk about in terms of [Drupal](http://drupal.org) which one of the most important Open Source project around the world. I know you will say, well Drupal right now is translated in some level to [110+](https://localize.drupal.org) languages which is again a remarkable achievement, but there is always a but, this is only from end user point of view, what about the documentation necessary for people who pretend to support those multilingual site and without knowledge of English.

Again you can quote again the  commandment for non English speakers is "**You** must learn english if you want to work in this industry" in the sense that if you are or pretending to be a web developer you are suppose to be able to handle some level of English. The problem is using that logic we are automatically excluding the [85%](https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers) of population around the world.

Although, these numbers could be justified in terms that 15% is good enough to attend IT needs of other populations, but remember not all of them are IT guys, that would be so sad.

So, why is it so important to try to attend the needs of non English speakers in Drupal community for web development? Well if you check the numbers of penetration of Drupal in Africa and Asia and in some level in Latin America are almost nothing nothing compared to the numbers in the US/Canada and Europe.

If you are wondering why? The answer is easy, if the locals can't understand the logic behind a product, companies or organisations only have two options A) Hire a really expensive developer overseas B) Find an alternative solution with documentation in their language or at least enough resources in their local market trained to maintain that product.

Then, who is guilty for this situation? Maybe the top notch developers in the US, Canada or Europe, because they don't think in that 85% I mention before, **NO** is not their fault, surprise surprise is our fault, correct you don't misread is our fault, you may not know but I am a Colombian living in Costa Rica, so basically a Latin American by definition and I didn't speak a word of English until 9 years ago, so if you speak & understand English and you have access to that information and you don't produce content in your mother language too, then is your fault.

Basically that top notch developers living in the US/Canada and Europe use the language they know, so is our responsibility to translate or produce IT documentation in our languages Spanish, French, Portuguese, Mandarin, Russian, Hindi etc. By doing this kind of contributions we can introduce a huge and positive impact in our societies because that means that 85% of the population will now have access to the edge of technology and that clever guy that we ignore before will join us to produce a change in our developing societies.

Before you ask yourself, well what are you doing in this direction. I maintain my blog in Spanish too, you can check at [7sabores.com](http://7sabores.com/blogs/enzo) and in any project I'm involved I try to include the multilingual component, for instance let me show you how you can translate the project [Drupal Console](http://drupalconsole.org), project I have been investing all my "free time", into your mother language.

# Clone Drupal Console Project

Go to github repository project [https://github.com/hechoendrupal/DrupalConsole](https://github.com/hechoendrupal/DrupalConsole) and hit the button *fork* on the top of page

# Clone your forked repo

```
$ git clione git@github.com:YOURUSERHERE/DrupalConsole.git
```

# Add your language translation

Imagine you want translate Drupal Console to [Hindi](https://en.wikipedia.org/wiki/Hindi) which is spoken by 250 millions human beings. just follow the following instructions

```
$ cd DrupalConsoleFolder
$ cp config/translations/console.en.yml config/translations/console.hi.yml
```

Now you have a YAML file and you can start to translating string to your mother language.

# Enable DrupalConsole in your language

```
$ cd DrupalConsoleFolder
$ ./bin/console init
```

The command above generate a config file for Drupal Console located in **~/.console/config.yml**, to enable the new Hindi language, event that language is not part of Drupal Console yet, just change the file and must be locks similar to this snippet.

```
application:
  environment: 'prod'
  language: hi
  editor: vim
  temp: /tmp
```

# Contribute your new language

You just need to add your language to git and commit to your forked repository github will help you to create a Pull Request, but if you need support for that you can contact us (the maintainers) in our support chat at [https://gitter.im/hechoendrupal/DrupalConsole](https://gitter.im/hechoendrupal/DrupalConsole).

# Sync your changes
If you are worry because new functionality was added and you are behind, don't worry we added to Drupal Console a command to sync YAML translation files.

```
$ cd DrupalConsoleFolder
$ ./bin/console yaml:merge console.hi.yml console.en.yml console.hi.yml
```

The command above will retain your translation and bring additions to your translation file.

"If you talk to a man in a language he understands, that goes to his head. If you talk to him in his language, that goes to his heart" Nelson Mandela

Muchas gracias for reading this article.