import { View, ButtonView } from 'ckeditor5';
import { PRESET_WIDTHS, ALIGNMENTS } from '../containerblock/constants';

export default class ContainerBlockToolbarView extends View {
    constructor(locale) {
        super(locale);

        this.set('width', 100);
        this.set('alignment', 'center');

        this.children = this.createCollection();
        this._widthButtons = [];
        this._alignmentButtons = [];

        this._createChildren();

        this.setTemplate({
            tag: 'div',
            attributes: {
                class: ['ck', 'ck-container-block-toolbar'],
                tabindex: '-1'
            },
            children: this.children
        });
    }

    _createChildren() {
        const bind = this.bindTemplate;

        // Info row
        const infoRow = new View(this.locale);
        infoRow.setTemplate({
            tag: 'div',
            attributes: {
                class: ['ck-container-toolbar-row']
            },
            children: [
                {
                    tag: 'span',
                    attributes: {
                        class: ['ck-container-info']
                    },
                    children: [
                        {
                            text: bind.to('width', w => `幅: ${w}%`)
                        }
                    ]
                }
            ]
        });
        this.children.add(infoRow);

        // Controls row
        const controlsRow = new View(this.locale);
        const widthButtons = this._createWidthButtons();
        const alignmentButtons = this._createAlignmentButtons();

        controlsRow.setTemplate({
            tag: 'div',
            attributes: {
                class: ['ck-container-toolbar-row']
            },
            children: [
                {
                    tag: 'div',
                    attributes: {
                        class: ['ck-container-controls']
                    },
                    children: widthButtons
                },
                {
                    tag: 'div',
                    attributes: {
                        class: ['ck-container-controls']
                    },
                    children: alignmentButtons
                }
            ]
        });
        this.children.add(controlsRow);

        // Paragraph insertion row
        const insertRow = new View(this.locale);
        const insertButtons = this._createInsertButtons();

        insertRow.setTemplate({
            tag: 'div',
            attributes: {
                class: ['ck-container-toolbar-row']
            },
            children: [
                {
                    tag: 'div',
                    attributes: {
                        class: ['ck-container-controls', 'ck-container-insert-controls']
                    },
                    children: insertButtons
                }
            ]
        });
        this.children.add(insertRow);
    }

    _createWidthButtons() {
        return PRESET_WIDTHS.map((preset, index) => {
            const button = new ButtonView(this.locale);

            button.set({
                label: preset.label,
                withText: true,
                class: 'ck-container-preset-button'
            });

            button.on('execute', () => {
                this.fire('setWidth', preset.value);
            });

            this._widthButtons.push(button);

            return button;
        });
    }

    _createAlignmentButtons() {
        return ALIGNMENTS.map((align, index) => {
            const button = new ButtonView(this.locale);

            button.set({
                label: align.label,
                withText: true,
                class: 'ck-container-align-button'
            });

            button.on('execute', () => {
                this.fire('setAlignment', align.value);
            });

            this._alignmentButtons.push(button);

            return button;
        });
    }

    _createInsertButtons() {
        const buttons = [];

        // Insert paragraph before
        const insertBeforeButton = new ButtonView(this.locale);
        insertBeforeButton.set({
            label: '前に段落を追加',
            withText: true,
            class: 'ck-container-insert-button'
        });

        insertBeforeButton.on('execute', () => {
            this.fire('insertBefore');
        });
        buttons.push(insertBeforeButton);

        // Insert paragraph after
        const insertAfterButton = new ButtonView(this.locale);
        insertAfterButton.set({
            label: '後に段落を追加',
            withText: true,
            class: 'ck-container-insert-button'
        });

        insertAfterButton.on('execute', () => {
            this.fire('insertAfter');
        });
        buttons.push(insertAfterButton);

        return buttons;
    }

    render() {
        super.render();
    }

    destroy() {
        super.destroy();
    }
}
