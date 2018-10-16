---
layout: post
title: How to create an interactive command in Node.js
description: "Practical guide about how to create a interactive command interface with Node.js"
categories: [articles]
tags: [Node.js, Javascript]
draft: false
---
One of the first things we learn in a new programming language is how to  implement a command line is to read the parameters provided by user in execution, today I want to make my first blog related to <a target="_blank" href="http://nodejs.org/">Node.js</a> and I will show you how to make an interactive interface with Node.js.

For those who are unfamiliar with the concept of interactive interfaces may refer to popular <a target="_blank" href="http://es.wikipedia.org/wiki/Ncurses">NCurses</a> used in <a target="_blank" href="http://es.wikipedia.org/wiki/GNU/Linux">GNU/Linux</a> platforms.

#Install Inquirer plugin.

Assuming you already installed Node.js we will use npm command to install the plugin inquirer to provide us an easy way to creating an interface.

```
$ npm install inquirer
```

#Create interactive script

With the Inquirer plugin installed, we need to create a script called interactivo.js in which we will create our script.

The first thing to do is load the library inquirer as shown below.

```
var inquirer = require("inquirer");
```

To use Inquirer we just pass an array of objects with questions and an anonymous function that will process the responses received, let me show an example the format of implementation.

```
inquirer.prompt([/* Pass your questions in here */], function( answers ) {
    // Use user feedback for... whatever!!
});
```

Now let's see the types of questions that we can build.

##Input

Input type questions are simple questions that can have a default value and the response is stored in a variable equal to the name that is provided in the configuration, see the implementation.

```
{
  type: 'input',
  name: 'nombre',
  message: 'Nombre Completo?',
  default: 'Jose Perez'
},
```

##Confirm

The confirm questions are of the type Yes or NO let's see an example of its implementation.

```
{ type: 'confirm',
  name: 'casado',
  message: 'Casado?',
},
```

#List

The list questions allows you to select your answer from a list of predefined options, as shown below.

```
{
  type: "list",
  name: "estudios",
  message: "Nivel academico?",
  choices: [
    "Primaria",
    "Secundaria",
    new inquirer.Separator(),
    "Bachillerato",
    "Licenciatura",
    "Doctorado"
   ]
},
```

This type of question allows placing a separator of options as is seen in the above list.

#Checkbox

The checkbox questions type allows the user to check a list of options which apply in his case, as shown in the following code listing.

```
{
  type: "checkbox",
  message: "Servicios Publicos",
  name: "servicios",
  choices: [
    {
      name: "Agua",
      checked: true
    },
    {
      name: "Luz"
    },
    {
      name: "Internet"
    },
    ],
}
```

#Password

The password questions type as its name suggest use a mask to hide what the user is typing on the screen, let's see an example.

```
{
  type: "password",
  message: "Enter your git password",
  name: "password"
}
```

Let's now look full implementation.

```
var inquirer = require("inquirer");
 
var preguntas = [
    {
      type: 'input',
      name: 'nombre',
      message: 'Nombre Completo?',
      default: 'Jose Perez'
    },
    { type: 'confirm',
      name: 'casado',
      message: 'Casado?',
    },
    { when: function (response) {
        return response.casado;
      },
      type: 'input',
      name: 'hijos',
      message: 'Número de hijos?',
    },
    {
    type: "list",
    name: "estudios",
    message: "Nivel academico?",
    choices: [
      "Primaria",
      "Secundaria",
      new inquirer.Separator(),
      "Bachillerato",
      "Licenciatura",
      "Doctorado"
     ]
    },
    {
    type: "checkbox",
    message: "Servicios Publicos",
    name: "servicios",
    choices: [
      {
        name: "Agua",
        checked: true
      },
      {
        name: "Luz"
      },
      {
        name: "Internet"
      },
      ],
    }
    ];
inquirer.prompt(preguntas, function(respuestas) {
  console.log(respuestas);
});
```

As you can see what I did was create an array with objects with the definitions of the types of questions outlined above and this arrangement is passed to inquirer.prompt function and as the second parameter an anonymous function is pass to prints the user's responses.

Within the definition of the questions the script add a bonus which is the use of when tproperty. When is a property that allows us to validate if we show or not a question validating the previous answers as shown below.

```
when: function (response) {
  return response.casado;
}
```

#Execute the script.

To run the newly created script we just run the following command line.

```
$ node interactivo.js
```

Depending on user responses the result will be different, but similar to the following image.

<img src="{{site.url}}/assets/img/nodejs_interactive.png"/>

I hope you have found this blog useful.
