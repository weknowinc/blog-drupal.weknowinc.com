---
layout: post
title: How to create a Rest Resource in Drupal 8
description: "Explanation to create a custom Rest Resource in Drupal 8"
categories: [articles]
tags: [Drupal, Drupal Modules, Rest]
draft: false
---
One of the biggest changes in <a href="https://www.drupal.org/drupal-8.0" target="_blank">Drupal 8</a> is his integration with <a href="http://en.wikipedia.org/wiki/Representational_state_transfer" target="_blank">RESTful</a>.

Today I want to share with you how to create your own Rest Resources in a custom module to publish your website information using a RESTful API.

I will create a new REST Resource with the objective to get the list of bundle types available for a specific entity.

#Create a Module

I will skip the explanation about how to create a Module in Drupal 8 because could be generated using the project <a href="http://drupalconsole.com/" target="_blank">Drupal Console</a> executing the following command.

```
$ php console.phar generate:module
```

#Create a new REST Resource

Assuming we create a new module named **entity_rest_extra** is required to create a class file **EntityBundlesResource.php** inside the module in a folder path **src/Plugin/rest/resource**.

##Namespace

The namespace for this new Rest Resource will be

```
namespace Drupal\entity_rest_extra\Plugin\rest\resource;
```

##Libraries

We must to use some dependencies to create the REST Resource, below the full list.

```
use Drupal\Core\Entity\EntityManagerInterface;
use Drupal\rest\Plugin\ResourceBase;
use Drupal\rest\ResourceResponse;
use Drupal\Core\Session\AccountProxyInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Psr\Log\LoggerInterface;
```

##Annotations

To enable the Discover for REST Resources found our new Rest Resource we must to implement the proper information in Annotation. check the following example.

```
/**
 * Provides a resource to get bundles by entity.
 *
 * @RestResource(
 *   id = "entity_bundles",
 *   label = @Translation("Bundles by entities"),
 *   uri_paths = {
 *     "canonical" = "/bundles/{entity}"
 *   }
 * )
 */
```

As you can see we provide a Resource **id** with a **label**, also we define the **canonical** URL for our REST Resource with a parameter named **entity**

Using the annotation the Discover for Rest Resources will declare the routing dynamically so we don't need include a **routing.yml** file in our module.

##Implement Class

Now we have to create a class extending from <a href="https://api.drupal.org/api/drupal/core%21modules%21rest%21src%21Plugin%21ResourceBase.php/class/ResourceBase/8" target="_blank">ResourceBase</a> as you can see in the following snippet

```
class EntityBundlesResource extends ResourceBase {
  /**
   *  A curent user instance.
   *
   * @var \Drupal\Core\Session\AccountProxyInterface
   */
  protected $currentUser;
  /**
   *  A instance of entity manager.
   *
   * @var \Drupal\Core\Entity\EntityManagerInterface
   */
  protected $entityManager;
}
```

Our implementation require two properties for **Current User** and **EntityManager**.

#Class Setup

As you can imagine each class require a constructor and Drupal 8 is not the exception, but Drupal also implement
<a href="http://www.phptherightway.com/pages/Design-Patterns.html" target="_blank">The Factory Pattern</a> to prepare the values to send to constructor.

But is better to explain to you with the following example where we need to send the <a href="https://www.drupal.org/node/2133171" target="_blank">services</a>: **Resource Format**, **Logger**, **Entity manager** and **Current User** to the **constructor**

```
/**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->getParameter('serializer.formats'),
      $container->get('logger.factory')->get('rest'),
      $container->get('entity.manager'),
      $container->get('current_user')
    );
  }
```

Now we need to define the constructor where we are receiving the values from the create method, as you can see below.

```
/**
  * Constructs a Drupal\rest\Plugin\ResourceBase object.
  *
  * @param array $configuration
  *   A configuration array containing information about the plugin instance.
  * @param string $plugin_id
  *   The plugin_id for the plugin instance.
  * @param mixed $plugin_definition
  *   The plugin implementation definition.
  * @param array $serializer_formats
  *   The available serialization formats.
  * @param \Psr\Log\LoggerInterface $logger
  *   A logger instance.
  */
  public function __construct(
    array $configuration,
    $plugin_id,
    $plugin_definition,
    array $serializer_formats,
    LoggerInterface $logger,
    EntityManagerInterface $entity_manager,
    AccountProxyInterface $current_user) {
    parent::__construct($configuration, $plugin_id, $plugin_definition, $serializer_formats, $logger);

    $this->entityManager = $entity_manager;
    $this->currentUser = $current_user;
  }
```

#Implement REST method

Last but not least we have to define the RESTful state we want to implement, in my example I want to implement a GET method to response according the parameters.

Inside the class with have to create a method matching the RESTful state name, so for GET we have to implement a method named **get** as you can see in the following snippet.

```
  /*
   * Responds to GET requests.
   *
   * Returns a list of bundles for specified entity.
   *
   * @return \Drupal\rest\ResourceResponse
   *   The response containing a list of bundle names.
   *
   * @throws \Symfony\Component\HttpKernel\Exception\HttpException
   */
  public function get($entity = NULL) {
    if ($entity) {
      $permission = 'Administer content types';
      if(!$this->currentUser->hasPermission($permission)) {
        throw new AccessDeniedHttpException();
      }
      $bundles_entities = \Drupal::entityManager()->getStorage($entity .'_type')->loadMultiple();
      $bundles = array();
      foreach ($bundles_entities as $entity) {
        $bundles[$entity->id()] = $entity->label();
      }
      if (!empty($bundles)) {
        return new ResourceResponse($bundles);
      }
      throw new NotFoundHttpException(t('Bundles for entity @entity were not found', array('@entity' => $entity)));
    }

    throw new HttpException(t('Entity wasn\'t provided'));
  }
```
As you can see the method receive as parameter the last value pass to URL.

Also using the <a href="https://api.drupal.org/api/drupal/core%21lib%21Drupal%21Core%21Session%21AccountProxyInterface.php/interface/AccountProxyInterface/8" target="_blank">Account Proxy Interface</a> we can determine if Current User has enough rights to get the bundle list.

The <a href="https://api.drupal.org/api/drupal/core%21lib%21Drupal%21Core%21Entity%21EntityManagerInterface.php/interface/EntityManagerInterface/8" target="_blank">Entity Manager Interface</a> allow us to we get the list of bundles for Entity requested.

After that we prepare an array with the results, these results will be transformed to the proper format requested by the user using the class <a href="https://api.drupal.org/api/drupal/core%21modules%21rest%21src%21ResourceResponse.php/class/ResourceResponse/8" target="_blank">ResourceResponse</a>, in our case we will request a json response.

If you want to implement RESTful state POST just add a method **post**

You can see a full and functional custom REST Resources at <a href="https://github.com/enzolutions/entity_rest_extra" target="_blank">https://github.com/enzolutions/entity_rest_extra</a>

#Using our new Resource

Using the contrib module <a href="https://www.drupal.org/project/restui/git-instructions" target="_blank">Rest UI</a> (I recommend to use the git version until Drupal 8 get a first release) you can enable your custom Rest Resource.

This module enable a UI to set the Authentication and format for each RESTful method implemented as you can see in the following image.

<img src="{{site.url}}/assets/img/restui_bundle_entities_settings.png"/>

Using this setting the access to Resource will be granted or denied.

Using the Chrome Application <a href="https://chrome.google.com/webstore/detail/postman-rest-client/fdmmgilgnpjigdojojpjoooidkmcomcm">Postman - REST Client</a> you can execute an authenticated request to URL **http://example.com/bundles/node** as you can see in the following image.

<img src="{{site.url}}/assets/img/postman_rest_request.png"/>

If all is working as expected you will get a similar result to next json output.

```
{
  "article": "Article",
  "page": "Basic page"
}
```

I hope you find this blog entry usefull.

