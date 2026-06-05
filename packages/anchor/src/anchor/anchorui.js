import { Plugin, ButtonView } from 'ckeditor5';
import i18next from 'i18next';
import languageBundle from '@lang/index?targets=anchor';
import AnchorFormView from '../ui/anchorformview';
import { validateAnchorId } from './anchorutils';
import anchorIcon from '../../theme/icons/anchor.svg';
import { ANCHOR } from './constants';

export default class AnchorUI extends Plugin {
    static get pluginName() {
        return 'AnchorUI';
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
            ns: ['anchor'],
            defaultNS: 'anchor',
            initImmediate: false,
            interpolation: { prefix: '%{', suffix: '}' },
        });

        this.formView = this._createFormView();

        this._createButton();
    }

    _createFormView() {
        const formView = new AnchorFormView(this.editor.locale, this._i18n);

        // Validate against the current document state, ignoring the anchor being edited.
        formView.validator = id => {
            const existing = this.editor.commands.get(ANCHOR).value;
            return validateAnchorId(this.editor.model, id, existing ? existing.id : null);
        };

        formView.render();
        document.body.appendChild(formView.element);

        formView.on('submit', (evt, data) => {
            // Restore the selection captured when the form opened: focusing the
            // form's input moves focus out of the editor and, in some cases
            // (e.g. inside a table cell), the model selection can change before
            // the user submits. Without this, the anchor could land in the wrong
            // place or not be applied at all.
            this._restoreSelection();
            this.editor.execute(ANCHOR, { id: data.id });
            this._clearSavedSelection();
            this.editor.editing.view.focus();
        });

        formView.on('remove', () => {
            this._restoreSelection();
            this.editor.execute(ANCHOR, { remove: true });
            this._clearSavedSelection();
            this.editor.editing.view.focus();
        });

        formView.on('cancel', () => {
            this._clearSavedSelection();
            this.editor.editing.view.focus();
        });

        return formView;
    }

    // Capture the current model selection so it can be restored after the form
    // (which steals DOM focus) is dismissed. The form does not mutate the model
    // while it is open, so plain (immutable) ranges are sufficient - they stay
    // valid until the user submits.
    _saveSelection() {
        const selection = this.editor.model.document.selection;
        this._savedRanges = Array.from(selection.getRanges());
    }

    _restoreSelection() {
        if (!this._savedRanges || this._savedRanges.length === 0) {
            return;
        }
        this.editor.model.change(writer => writer.setSelection(this._savedRanges));
    }

    _clearSavedSelection() {
        this._savedRanges = null;
    }

    _createButton() {
        const editor = this.editor;
        const command = editor.commands.get(ANCHOR);
        const t = key => this._i18n.t(key);

        editor.ui.componentFactory.add(ANCHOR, locale => {
            const button = new ButtonView(locale);

            button.set({
                label: t('Anchor'),
                icon: anchorIcon,
                tooltip: true,
            });

            button.bind('isEnabled').to(command, 'isEnabled');
            // Highlight the button when the selection sits on an existing anchor.
            button.bind('isOn').to(command, 'value', value => !!value);

            button.on('execute', () => {
                // All anchor actions (insert / rename / remove) happen in the form,
                // not in a balloon, so the anchor never competes with the balloons of
                // images, tables, or other widgets.
                const existing = command.value;
                // Capture the selection before the form steals focus.
                this._saveSelection();
                this.formView.show({
                    id: existing ? existing.id : '',
                    isEdit: !!existing,
                });
            });

            return button;
        });
    }

    destroy() {
        super.destroy();
        this._clearSavedSelection();
        if (this.formView && this.formView.element && this.formView.element.parentNode) {
            this.formView.element.parentNode.removeChild(this.formView.element);
        }
        if (this.formView) {
            this.formView.destroy();
        }
    }
}
