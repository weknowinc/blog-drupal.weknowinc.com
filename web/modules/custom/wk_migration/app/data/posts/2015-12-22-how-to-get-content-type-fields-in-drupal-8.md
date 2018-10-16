---
layout: post
title: "How to get content type fields in Drupal 8"
categories: [articles]
tags: [Drupal,Drupal 8,PHP]
---
The creation of custom logic for our customer sometimes requires a certain level of automatisation in terms that our logic must be flexible to support changes in the data structure.

In Drupal 8 the most common way to represent data is using node entities, and we could create different types of content types or bundles for node entities.

Each content type could increase or decrease the amount and type of fields assigned to each content type, and our code must be prepared to handle that situations.

I will explain to you, how to get content type definition and use that information to flatten a node object into an array.

#Getting content type fields definition

Firstly I will create a function to get fields definition for a content type machine name provided, of course, you can implement this function as a method in your classes. 

```
function contentTypeFields($contentType) {
    $entityManager = Drupal::service('entity.manager');
    $fields = [];
    
    if(!empty($contentType) {
        $fields = array_filter(
            $entityManager->getFieldDefinitions('node', $contentType), function ($field_definition) {
                return $field_definition instanceof FieldConfigInterface;
            }
        );
    }
          
    return $fields;      
}
```

In this case, I am only interested in use field machine name, but you can do a different approach to doing something with field definition itself.

Also, I use node as a hard-coded entity type, but you can use any entity, to get their bundle field definition.

#Flatten node

Using the field definition array, we can get all node values and assign to an array. I will use an imaginary content type machine name *ticket*

```
use Drupal\node\Entity\Node;
use Drupal\field\FieldConfigInterface;

// Load node
$node = Node::load($ticketID);

$fields = contentTypeFields('ticket'); // Replace your content type machine name here.

$ticket['title'] = $node->get('title')->value;
foreach($fields as $fieldID => $field){
    $ticket[$fieldID] = $node->get($fieldID)->getValue();
}

print_r($ticket);

```

The code above will produce an output similar to this

```
Array
(
    [title] => This is an unassigned ticket
    [field_description] => Array
        (
            [0] => Array
                (
                    [value] => Create a ticket with no one assigned to make sure the system handles it well
                )

        )
    [field_status] => Array
        (
            [0] => Array
                (
                    [target_id] => 2
                )

        )

    [field_ticket_type] => Array
        (
            [0] => Array
                (
                    [target_id] => 9
                )

        )

)
```
After transform node into an innocuous array, you can add or remove any information required.

This kind of transformation is useful in Drupal 8, to skip some validation in the object render to avoid content injection.

Maybe you are thinking why not use function [get_object_vars](http://php.net/manual/en/function.get-object-vars.php), well all properties are protected and are only accessible using get method, get_object_vars only return public properties, so doesn't work for our purpose.


Another idea could be, just use an array casting to transform node object into an array, but if you try to do that and exception is thrown with the following error message.

**A fatal error occurred: Could not normalize object of type Drupal\Core\Field\BaseFieldDefinition, no supporting normalizer found.**

I hope did you found this article useful.
