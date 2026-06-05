import { Plugin, ButtonView, ContextualBalloon } from 'ckeditor5';
import i18next from 'i18next';
import languageBundle from '@lang/index?targets=grid-layout';
import GridLayoutToolbarView from '../ui/gridlayouttoolbarview';
import GridLayoutFormView from '../ui/gridlayoutformview';
import gridLayoutIcon from '../../theme/icons/grid-layout.svg';
import { GRID_LAYOUT } from './constants';

export default class GridLayoutUI extends Plugin {
    static get requires() {
        return [ContextualBalloon];
    }

    static get pluginName() {
        return 'GridLayoutUI';
    }

    init() {
        const editor = this.editor;
        const langConfig = editor.config.get('language') || 'ja';
        const lang = typeof langConfig === 'string' ? langConfig : langConfig.ui || 'ja';

        this._i18n = i18next.createInstance();
        this._i18n.init({
            lng: lang,
            fallbackLng: 'ja',
            resources: languageBundle,
            ns: ['grid-layout'],
            defaultNS: 'grid-layout',
            initImmediate: false,
            interpolation: { prefix: '%{', suffix: '}' },
        });

        this._balloon = editor.plugins.get(ContextualBalloon);
        this.toolbarView = this._createToolbarView();
        this.formView = this._createFormView();

        this._createButton();
        this._enableBalloonActivators();
    }

    _createFormView() {
        const formView = new GridLayoutFormView(this.editor.locale, this._i18n);
        formView.render();
        document.body.appendChild(formView.element);

        formView.on('submit', (evt, data) => {
            if (this._editingExisting) {
                this.editor.execute(GRID_LAYOUT, { update: data.configs, gutter: data.gutter });
                this._updateToolbarInfo();
            } else {
                this.editor.execute(GRID_LAYOUT, { columns: data.configs, gutter: data.gutter });
                setTimeout(() => {
                    const gridElement = this._getSelectedGridElement();
                    if (gridElement) {
                        this._showPanel();
                    }
                }, 50);
            }
            this._editingExisting = false;
            this.editor.editing.view.focus();
        });

        formView.on('cancel', () => {
            this._editingExisting = false;
            this.editor.editing.view.focus();
        });

        return formView;
    }

    _createToolbarView() {
        const toolbarView = new GridLayoutToolbarView(this.editor.locale, this._i18n);

        toolbarView.on('addRow', () => {
            this.editor.execute(GRID_LAYOUT, { addContentRow: true });
            this.editor.editing.view.focus();
        });

        toolbarView.on('deleteRow', () => {
            this.editor.execute(GRID_LAYOUT, { deleteContentRow: true });
            this._hidePanel();
            this.editor.editing.view.focus();
        });

        toolbarView.on('insertBefore', () => {
            this._insertParagraph('before');
        });

        toolbarView.on('insertAfter', () => {
            this._insertParagraph('after');
        });

        return toolbarView;
    }

    _createButton() {
        const editor = this.editor;
        const command = editor.commands.get(GRID_LAYOUT);
        const t = key => this._i18n.t(key);

        editor.ui.componentFactory.add(GRID_LAYOUT, locale => {
            const button = new ButtonView(locale);

            button.set({
                label: t('Grid Layout'),
                icon: gridLayoutIcon,
                tooltip: true,
            });

            button.bind('isEnabled').to(command, 'isEnabled');

            button.on('execute', () => {
                if (command.value) {
                    this._editingExisting = true;
                    this.formView.show({
                        columnCount: command.value.configs.length,
                        configs: command.value.configs,
                        gutter: command.value.gutter,
                        isEdit: true,
                    });
                } else {
                    this._editingExisting = false;
                    this.formView.show();
                }
            });

            return button;
        });
    }

    _enableBalloonActivators() {
        const editor = this.editor;
        const viewDocument = editor.editing.view.document;

        this.listenTo(viewDocument, 'click', () => {
            const gridElement = this._getSelectedGridElement();
            if (gridElement) {
                this._showPanel();
            }
        });

        this.listenTo(viewDocument, 'selectionChange', () => {
            const gridElement = this._getSelectedGridElement();
            if (gridElement) {
                if (this._balloon.hasView(this.toolbarView)) {
                    this._updateToolbarPosition();
                    this._updateToolbarInfo();
                }
            } else {
                this._hidePanel();
            }
        });
    }

    _showPanel() {
        if (this._balloon.hasView(this.toolbarView)) return;

        const gridElement = this._getSelectedGridElement();
        if (!gridElement) return;

        this._updateToolbarInfo();

        this._balloon.add({
            view: this.toolbarView,
            position: this._getBalloonPositionData(),
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

    _updateToolbarInfo() {
        const command = this.editor.commands.get(GRID_LAYOUT);
        const t = key => this._i18n.t(key);

        if (command.value) {
            const { templateSize, gutter } = command.value;
            const template = command.value.configs.slice(0, templateSize);

            const lines = [];

            const defaultRatio = template.map(c => c.colDefault).join(':');
            lines.push(`Default(${defaultRatio}) , g-${gutter}`);

            const mdRatio = template.map(c => c.colMd);
            if (mdRatio.some(v => v)) {
                lines.push(`MD(${mdRatio.join(':')})`);
            }

            const lgRatio = template.map(c => c.colLg);
            if (lgRatio.some(v => v)) {
                lines.push(`LG(${lgRatio.join(':')})`);
            }

            const xlRatio = template.map(c => c.colXl);
            if (xlRatio.some(v => v)) {
                lines.push(`XL(${xlRatio.join(':')})`);
            }

            this.toolbarView.setInfo(lines);
        }
    }

    _getBalloonPositionData() {
        const view = this.editor.editing.view;
        const gridElement = this._getSelectedGridElement();

        return {
            target: view.domConverter.mapViewToDom(gridElement),
        };
    }

    _getSelectedGridElement() {
        const selection = this.editor.editing.view.document.selection;

        // Check if widget is directly selected
        const selectedElement = selection.getSelectedElement();
        if (selectedElement && selectedElement.hasClass('ck-grid-row')) {
            return selectedElement;
        }

        // Walk up from cursor position
        let element = selection.getFirstPosition().parent;
        while (element) {
            if (element.is('element') && element.hasClass('ck-grid-row')) {
                return element;
            }
            element = element.parent;
        }

        return null;
    }

    _insertParagraph(position) {
        const editor = this.editor;
        const model = editor.model;
        const selection = model.document.selection;

        model.change(writer => {
            let gridRow = null;
            let element = selection.getFirstPosition().parent;
            while (element) {
                if (element.is('element') && element.name === 'gridRow') {
                    gridRow = element;
                    break;
                }
                element = element.parent;
            }

            if (gridRow) {
                const parent = gridRow.parent;
                const index = parent.getChildIndex(gridRow);
                const paragraph = writer.createElement('paragraph');
                writer.insert(paragraph, parent, position === 'before' ? index : index + 1);
                writer.setSelection(paragraph, 0);
            }
        });

        this._hidePanel();
        editor.editing.view.focus();
    }

    destroy() {
        super.destroy();

        if (this.formView.element && this.formView.element.parentNode) {
            this.formView.element.parentNode.removeChild(this.formView.element);
        }
        this.formView.destroy();
    }
}
