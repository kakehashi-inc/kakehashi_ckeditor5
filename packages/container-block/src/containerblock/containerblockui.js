import { Plugin, ButtonView, ContextualBalloon } from 'ckeditor5';
import ContainerBlockToolbarView from '../ui/containerblockboolbarview';
import containerBlockIcon from '../../theme/icons/container-block.svg';
import { CONTAINER_BLOCK } from './constants';

export default class ContainerBlockUI extends Plugin {
    static get requires() {
        return [ContextualBalloon];
    }

    static get pluginName() {
        return 'ContainerBlockUI';
    }

    init() {
        const editor = this.editor;

        this._balloon = editor.plugins.get(ContextualBalloon);
        this.toolbarView = this._createToolbarView();

        this._createButton();
        this._enableBalloonActivators();
    }

    _createButton() {
        const editor = this.editor;
        const command = editor.commands.get(CONTAINER_BLOCK);

        editor.ui.componentFactory.add(CONTAINER_BLOCK, locale => {
            const button = new ButtonView(locale);

            button.set({
                label: 'コンテナブロック',
                icon: containerBlockIcon,
                tooltip: true
            });

            button.bind('isEnabled').to(command, 'isEnabled');

            button.on('execute', () => {
                if (command.value) {
                    editor.execute(CONTAINER_BLOCK, { unwrap: true });
                } else {
                    editor.execute(CONTAINER_BLOCK, { width: 100, alignment: 'center' });

                    // Show balloon toolbar after rendering completes
                    setTimeout(() => {
                        const containerElement = this._getSelectedContainerElement();
                        if (containerElement) {
                            this._showPanel();
                        }
                    }, 50);
                }
                editor.editing.view.focus();
            });

            return button;
        });
    }

    _createToolbarView() {
        const editor = this.editor;
        const toolbarView = new ContainerBlockToolbarView(editor.locale);

        // Width preset buttons
        toolbarView.on('setWidth', (evt, width) => {
            this._setContainerWidth(width);
        });

        // Alignment buttons
        toolbarView.on('setAlignment', (evt, alignment) => {
            this._setContainerAlignment(alignment);
        });

        // Insert paragraph buttons
        toolbarView.on('insertBefore', () => {
            this._insertParagraphBefore();
        });

        toolbarView.on('insertAfter', () => {
            this._insertParagraphAfter();
        });

        // Close button
        toolbarView.on('close', () => {
            this._hidePanel();
        });

        return toolbarView;
    }

    _enableBalloonActivators() {
        const editor = this.editor;
        const viewDocument = editor.editing.view.document;

        // Show toolbar when clicking on container block
        this.listenTo(viewDocument, 'click', (evt, data) => {
            const containerElement = this._getSelectedContainerElement();

            if (containerElement) {
                this._showPanel();
            }
        });

        // Show/hide toolbar when selecting container block
        this.listenTo(editor.editing.view.document, 'selectionChange', () => {
            const containerElement = this._getSelectedContainerElement();

            if (containerElement) {
                if (this._balloon.hasView(this.toolbarView)) {
                    // Update position if toolbar is already visible
                    this._updateToolbarPosition();

                    // Update width and alignment display
                    const width = parseInt(containerElement.getAttribute('data-width')) || 100;
                    const alignment = containerElement.getAttribute('data-alignment') || 'center';
                    this.toolbarView.width = width;
                    this.toolbarView.alignment = alignment;
                }
            } else {
                // Hide toolbar if not in container
                this._hidePanel();
            }
        });
    }

    _showPanel() {
        if (this._balloon.hasView(this.toolbarView)) {
            return;
        }

        const containerElement = this._getSelectedContainerElement();
        if (!containerElement) {
            return;
        }

        // Update toolbar state
        const width = parseInt(containerElement.getAttribute('data-width')) || 100;
        const alignment = containerElement.getAttribute('data-alignment') || 'center';

        this.toolbarView.width = width;
        this.toolbarView.alignment = alignment;

        this._balloon.add({
            view: this.toolbarView,
            position: this._getBalloonPositionData()
        });
    }

    _hidePanel() {
        if (this._balloon.hasView(this.toolbarView)) {
            this._balloon.remove(this.toolbarView);
        }
    }

    _updateToolbarPosition() {
        this._balloon.updatePosition(this._getBalloonPositionData());
    }

    _getBalloonPositionData() {
        const editor = this.editor;
        const view = editor.editing.view;
        const viewDocument = view.document;
        const containerElement = this._getSelectedContainerElement();

        return {
            target: view.domConverter.mapViewToDom(containerElement)
        };
    }

    _getSelectedContainerElement() {
        const editor = this.editor;
        const selection = editor.editing.view.document.selection;
        const selectedElement = selection.getSelectedElement();

        if (selectedElement && selectedElement.hasClass('container-block')) {
            return selectedElement;
        }

        // Check if we're inside a container block
        let element = selection.getFirstPosition().parent;
        while (element) {
            if (element.is('element') && element.hasClass('container-block')) {
                return element;
            }
            element = element.parent;
        }

        return null;
    }

    _setContainerWidth(width) {
        const editor = this.editor;
        const command = editor.commands.get(CONTAINER_BLOCK);

        command.updateAttributes({ width });

        // Update toolbar display
        this.toolbarView.width = width;

        editor.editing.view.focus();
    }

    _setContainerAlignment(alignment) {
        const editor = this.editor;
        const command = editor.commands.get(CONTAINER_BLOCK);

        command.updateAttributes({ alignment });

        // Update toolbar display
        this.toolbarView.alignment = alignment;

        editor.editing.view.focus();
    }

    _insertParagraphBefore() {
        const editor = this.editor;
        const model = editor.model;
        const selection = model.document.selection;

        model.change(writer => {
            // Find the container block
            let containerBlock = null;
            let element = selection.getFirstPosition().parent;

            while (element) {
                if (element.is('element') && element.name === 'containerBlock') {
                    containerBlock = element;
                    break;
                }
                element = element.parent;
            }

            if (containerBlock) {
                const parent = containerBlock.parent;
                const containerIndex = parent.getChildIndex(containerBlock);

                // Create new paragraph
                const paragraph = writer.createElement('paragraph');
                writer.insert(paragraph, parent, containerIndex);

                // Move selection to new paragraph
                writer.setSelection(paragraph, 0);
            }
        });

        this._hidePanel();
        editor.editing.view.focus();
    }

    _insertParagraphAfter() {
        const editor = this.editor;
        const model = editor.model;
        const selection = model.document.selection;

        model.change(writer => {
            // Find the container block
            let containerBlock = null;
            let element = selection.getFirstPosition().parent;

            while (element) {
                if (element.is('element') && element.name === 'containerBlock') {
                    containerBlock = element;
                    break;
                }
                element = element.parent;
            }

            if (containerBlock) {
                const parent = containerBlock.parent;
                const containerIndex = parent.getChildIndex(containerBlock);

                // Create new paragraph
                const paragraph = writer.createElement('paragraph');
                writer.insert(paragraph, parent, containerIndex + 1);

                // Move selection to new paragraph
                writer.setSelection(paragraph, 0);
            }
        });

        this._hidePanel();
        editor.editing.view.focus();
    }
}
