import { Plugin } from 'ckeditor5';
import { CONTAINER_BLOCK } from './constants';

export default class ContainerBlockResizer extends Plugin {
    static get pluginName() {
        return 'ContainerBlockResizer';
    }

    init() {
        this._setupResizeHandles();
    }

    _setupResizeHandles() {
        const editor = this.editor;
        const view = editor.editing.view;

        // Setup drag handlers
        this.listenTo(view.document, 'mousedown', (evt, data) => {
            const domTarget = data.domTarget;

            if (domTarget.classList.contains('ck-container-resize-handle')) {
                this._startResize(data, domTarget);
                data.preventDefault();
            }
        });
    }

    _startResize(data, handleElement) {
        const editor = this.editor;
        const view = editor.editing.view;

        const containerDom = handleElement.parentElement;

        const startX = data.domEvent.clientX;
        const startWidth = parseFloat(containerDom.style.width) || 100;

        // Get parent width for percentage calculation
        const parentWidth = containerDom.parentElement.offsetWidth;

        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaPercent = (deltaX / parentWidth) * 100;
            let newWidth = startWidth + deltaPercent;

            // Constrain to 10% - 100%
            newWidth = Math.max(10, Math.min(100, newWidth));

            // Round to 1%
            newWidth = Math.round(newWidth);

            // Update DOM directly for immediate visual feedback
            containerDom.style.width = `${newWidth}%`;
            containerDom.setAttribute('data-width', newWidth);

            // Update balloon toolbar display if visible
            const containerBlockUI = editor.plugins.get('ContainerBlockUI');
            if (containerBlockUI && containerBlockUI.toolbarView) {
                containerBlockUI.toolbarView.width = newWidth;
            }

            // Find and update model
            const viewElement = view.domConverter.mapDomToView(containerDom);
            if (viewElement) {
                const modelElement = editor.editing.mapper.toModelElement(viewElement);
                if (modelElement && modelElement.name === 'containerBlock') {
                    editor.model.enqueueChange(writer => {
                        writer.setAttribute('width', newWidth, modelElement);
                    });
                }
            }

            moveEvent.preventDefault();
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            // Ensure final model update
            const viewElement = view.domConverter.mapDomToView(containerDom);
            if (viewElement) {
                const modelElement = editor.editing.mapper.toModelElement(viewElement);
                if (modelElement && modelElement.name === 'containerBlock') {
                    const finalWidth = parseInt(containerDom.getAttribute('data-width'));
                    editor.model.change(writer => {
                        writer.setAttribute('width', finalWidth, modelElement);
                    });
                }
            }

            editor.editing.view.focus();
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
}
