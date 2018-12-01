/**
 * @file
 * TUI Editor implementation.
 */

(function(Drupal) {

    'use strict';

    /**
     * @namespace
     */
    Drupal.editors.tui_editor = {

        /**
         * Editor attach callback.
         *
         * @param {HTMLElement} element
         *   The element to attach the editor to.
         * @param {string} format
         *   The text format for the editor.
         *
         * @return {bool}
         *   Whether the editor was successfully attached.
         */
        attach: function(element, format) {
            var textarea = document.getElementById(element.id);
            var textarea_wapper = textarea.parentNode;
            textarea_wapper.id = element.id + '-wrapper';

            var textarea_field_wrapper = document.getElementById('node-edit-form-textarea-wrapper');
            textarea_field_wrapper.innerHTML += '<div class="code-html" style="border: none;"><div id="editSection"></div></div>';

            // @TODO strip HTML tags (br,other?)
            jQuery('#'+textarea_wapper.id).parents('.field--type-text-with-summary').hide();

            var editor = new tui.Editor({
                el: document.querySelector('#editSection'),
                initialEditType: 'wysiwyg',
                previewStyle: 'vertical',
                height: '480px',
                exts: ['scrollSync'],
                initialValue: document.getElementById(element.id).value,
                events: {
                    change: function () {
                        // @TODO strip HTML tags (br,other?)
                        document.getElementById(element.id).value = editor.getMarkdown();
                    }
                },
                toolbarItems: [
                    'heading',
                    'bold',
                    'italic',
                    'strike',
                    'divider',
                    'hr',
                    'quote',
                    'divider',
                    'ul',
                    'ol',
                    'indent',
                    'outdent',
                    'divider',
                    'table',
                    'image',
                    'link',
                    'divider',
                    'code',
                    'codeblock',
                ],
            });

            /* Override PopupImage Modal */
            jQuery('#editSection .tui-popup-wrapper').css('index', '1000');
            jQuery('#editSection .te-tab-section').remove();
            jQuery('#editSection .te-file-type').remove();
            jQuery('#editSection .te-url-type').addClass('te-tab-active');
            jQuery('#editSection .te-image-url-input').prop('readonly', true);
            jQuery('#editSection .te-image-url-input').attr("placeholder", "Click to open media browser");

            jQuery('#editSection .te-image-url-input').on('click', function(e){
                jQuery('#edit-media-library-open-button').click();
            });

            jQuery('#edit-media-library-update-widget').on("mousedown",function(e){
                var mediaId = jQuery('#edit-media-library-selection').val();
                jQuery.get('/api/media/image?filter[mid][value]='+mediaId+'&include=field_media_image', function( data ) {
                    if (data.included) {
                        jQuery('#editSection .te-image-url-input').val( data.included[0].attributes.url );
                        jQuery('#editSection .te-alt-text-input').val( data.included[0].attributes.filename );
                        jQuery('#editSection .te-alt-text-input').focus();
                    }
                });

                return false;
            });

            return editor;

        },
        // editormd
        /**
         * Editor detach callback.
         *
         * @param {HTMLElement} element
         *   The element to detach the editor from.
         * @param {string} format
         *   The text format used for the editor.
         * @param {string} trigger
         *   The event trigger for the detach.
         *
         * @return {bool}
         *   Whether the editor was successfully detached.
         */
        detach: function(element, format, trigger) {

        },

        /**
         * Reacts on a change in the editor element.
         *
         * @param {HTMLElement} element
         *   The element where the change occurred.
         * @param {function} callback
         *   Callback called with the value of the editor.
         */
        onChange: function(element, callback) {
            callback();
        }

    };

})(Drupal);
